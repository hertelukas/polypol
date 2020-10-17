const express       = require('express'),
      router        = express.Router({mergeParams: true}),
      User          = require('../models/user'),
      Location      = require('../models/location'),
      Branch        = require('../models/branch'),
      middleware    = require('../middleware'),
      bodyParser    = require('body-parser'),
      request       = require('request');

//All routes begin with /branches/

//Get the information about a specific branch 
router.get('/:id', middleware.checkBranchOwnership, function(req, res){
    Branch.findById(req.params.id, function(err, foundBranch){
        if(err){
            console.log("ERR - Branch not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            res.redirect('/');
        }else{
            Location.findOne({city: foundBranch.city}, function(err, foundLocation){
                if(err){
                    console.log("ERR - User not found: " + err);
                    req.flash('error', "Error, try again later or contact us!");
                    res.redirect('/');
                }else{
                    res.render('branches/index', {branch: JSON.stringify(foundBranch), value: foundLocation.value, userCash: req.user.cash, dark: req.user.dark, locationid: foundLocation._id});
                }
            });
        }
    });
});

//This is the post route to enable for every branch the update option. This gets posted form the form in /users/id/branches
router.post('/autoUpdate', middleware.isLoggedIn, function(req, res){
    var higher = false;
    if(req.body.higher) higher = true;
    var occupancyCheck = parseInt(req.body.occupancy);
    var priceGoal = Math.round(req.body.priceFactor / 10) / 10;
    var counter = 0;
    var branchesToSave = [];
    User.findById(req.user.id).populate("branches").exec(function(err, foundUser){
        if(err){
            console.log("ERR - User not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            return res.redirect('/');
        }
        Location.find(function(err, locations){
            var dict = [];
            locations.forEach(location => {
                dict[location.city] = location;
            });
            var locationToUpdate = req.body.location;

            foundUser.branches.forEach(branch => {
                var currentLocation = dict[branch.city];
                var occupancy = currentLocation.visitors / currentLocation.beds * 100;
                if(branch.city == locationToUpdate || locationToUpdate == "all" || locationToUpdate == "everywhere"){
                    if(higher && occupancy > occupancyCheck) {
                        branch.priceFactor = priceGoal;
                        branchesToSave.push(branch);
                        counter += 1;
                    }else if(!higher && occupancy < occupancyCheck){
                        branch.priceFactor = priceGoal;
                        branchesToSave.push(branch);
                        counter += 1;
                    }   
                }             
            });
            

            saveBranches(branchesToSave);
            function saveBranches(tempBranches){
                if(tempBranches.length >= 1) tempBranches[0].save().then(response => saveBranches(tempBranches.splice(1)));
                else{
                    Promise.resolve();
                    foundUser.cash -= counter * 5000;
                    foundUser.save();
                    req.flash('success', 'Updated ' + counter + ' branches and you payed ' + formatter.format(counter * 5000));
                    return res.redirect('back');
                } 
            }
        });
    });
});

//This enables/disables auto renovation for every branch. The autorenovation gets handled by the backend server
router.post('/autorenovate', middleware.isLoggedIn, function(req, res){
    User.findById(req.user.id).populate("branches").exec(function(err, foundUser){
        if(err){
            console.log("ERR - User not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            res.redirect('/');
        }else{
            foundUser.branches.forEach(branch => {
                branch.autorenovate = req.body.autorenovate;
                branch.save();             
            });
            foundUser.autorenovate = req.body.autorenovate;
            foundUser.save();
            return res.redirect('back');
        }
    });
});

//This is the route that changes one branch, defined in the id parameter.
router.post('/:id', middleware.checkBranchOwnership, function(req, res){
    Branch.findById(req.params.id, function(err, foundBranch){
        if(err){
            console.log("ERR - User not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            res.redirect('/');
        }else{
            var starsBefore = foundBranch.stars;
            var bedsBefore = foundBranch.beds;
            if(req.body.beds > 4 && req.body.beds <= 7000){
                foundBranch.beds = req.body.beds;
            }
            if(req.body.stars >= 0 && req.body.stars <= 6){
                foundBranch.stars = req.body.stars;
            }
            if(req.body.priceFactor >= 0.5 && req.body.priceFactor <= 2){
                foundBranch.priceFactor = req.body.priceFactor;
            }
    
            Location.findOne({city: foundBranch.city}, function(err, foundLocation){
                if(err){
                    console.log("ERR - User not found: " + err);
                    req.flash('error', "Error, try again later or contact us!");
                    res.redirect('/');
                }else{
                    //Calculating the price of the update on the backend as well, to prevent cheating
                    var difference = calcBranchPrice(foundLocation.value, req.body.stars, req.body.beds) - calcBranchPrice(foundLocation.value, starsBefore, bedsBefore);
                    if(difference < 0 && req.body.stars <= starsBefore){
                        difference = difference /2;
                    }else if(difference < 0){
                        difference = 0;
                    }
                    //The price is 10% + 5000 more expensive than the real value of the change. 
                    price = difference * 1.1 + 5000;
                    User.findById(req.user.id, function(err, foundUser){
                        if(err){
                            console.log("ERR - User not found: " + err);
                            req.flash('error', "Error, try again later or contact us!");
                            res.redirect('/');
                        }else{
                            if(foundUser.cash >= price){
                                foundUser.cash -= price;
                                foundUser.save();
                                foundBranch.save();
                                req.flash('success', 'Branch updated!');
                                res.redirect('/branches/' + req.params.id);
                            }else{
                                req.flash('error', 'Not enough money!');
                                res.redirect('/branches/' + req.params.id);
                            }
                        }
                    });
                }

            });    
        }
    });
});

//Renovating a specific branch
router.post('/:id/renovate', middleware.checkBranchOwnership, function(req, res){
    Branch.findById(req.params.id, function(err, foundBranch){
        if(err){
            console.log("ERR - Branch not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            res.redirect('/');
        }else{
            if(foundBranch.onSale){
                req.flash('error', 'Error, your branch is on sale and updates are not allowed!');
                return res.redirect('/leaderboard');
            }
            Location.findOne({city: foundBranch.city}, function(err, foundLocation){
                if(err){
                    console.log("ERR - Location not found: " + err);
                    req.flash('error', "Error, try again later or contact us!");
                    return res.redirect('/');               
                }
                var stars = foundBranch.stars;
                if(stars === 0) stars = 1;
                var price = foundLocation.value * stars * Math.sqrt(240 - foundBranch.renovation) * foundBranch.beds / 150;
                User.findById(req.user.id, function(err, foundUser){
                    if(err){
                        console.log("ERR - Branch not found: " + err);
                        req.flash('error', "Error, try again later or contact us!");
                        res.redirect('/');
                    }else{
                        if(foundUser.cash >= price){
                            foundUser.cash -= price;
                            foundUser.netWorth[foundUser.netWorth.length - 1] -= price;
                            foundUser.save();
                            foundBranch.renovation = 240;
                            foundBranch.save();
                            req.flash('success', "Branch renovated!");
                            res.redirect('/branches/' + req.params.id);
                        }else{
                            req.flash('error', "Error, you don't have enough money");
                            res.redirect('/branches/' + req.params.id);
                        }
                    }
                });
            });
        }
    });
});

function calcBranchPrice(basePrice, stars, beds){
    return parseInt(parseFloat(basePrice) + parseFloat(basePrice * stars ** 4) + parseFloat(beds * 0.01 * basePrice) * 1000);
}


var formatter = new Intl.NumberFormat('en-US',{
    style: 'currency',
    currency: 'USD',
});


module.exports = router;