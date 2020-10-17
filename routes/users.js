const express       = require('express'),
      router        = express.Router({mergeParams: true}),
      User          = require('../models/user'),
      Location      = require('../models/location'),
      Branch        = require('../models/branch'),
      middleware    = require('../middleware'),
      passport      = require('passport'),
      bodyParser    = require('body-parser'),
      nodemailer    = require('nodemailer'),
      async         = require('async'),
      request       = require('request');


router.get('/:id/confirm/:token', function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        if(err || !foundUser){
            console.log("ERR - User not found: " + err);
            req.flash("error", "Something went wrong. Try again later.");
            return res.redirect('/login');
        }
        if(foundUser.currentCode == req.params.token){
            foundUser.mailConfirmed = true;
            if(foundUser.invitedby && foundUser.invitedby != foundUser.username){
                User.findOne({username: foundUser.invitedby}, function(err, userToReward){
                    if(userToReward){
                        var rewarded = true;
                        if(userToReward && userToReward.invitesRemaining <= 0) reward = false;
                        if(userToReward && userToReward.invitesRemaining > 0){
                            userToReward.cash += 500000;
                            userToReward.invitesRemaining -= 1;
                        }else if(userToReward && reward){
                            userToReward.cash += 500000;
                            userToReward.invitesRemaining = 2;
                        }
                        userToReward.save();
                        req.flash('success', 'Mail verified and we rewarded ' + userToReward.username + ' with $500,000!');
                    }
                    else{
                        req.flash('success', "Mail confirmed. User not rewarded: Couldn't find " + foundUser.invitedby);
                    }

                    foundUser.invitedby = undefined;
                    foundUser.save();
                    return res.redirect('/');
                });
            }else{
                foundUser.save();
                req.flash('success', 'Mail verified');
                return res.redirect('/');
            }


        }else{
            req.flash("error", "The code is not valid. <a href='/users/" + foundUser._id + "/settings'> Send a new code </a>");
            return res.redirect("/");
        }
    });
});
    
router.get('/:id', middleware.checkOwnership, function(req, res){
    User.findById(req.params.id).populate('branches').exec(function(err, foundUser){
        if(err){
            console.log("ERR - User not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            res.redirect('/');
        }else{
            Location.find(function(err, foundLocations){
                if(err){
                    console.log("ERR - Location not found: " + err);
                    req.flash('error', "Error, try again later or contact us!");
                    res.redirect('/');
                }else{
                    foundLocations.forEach(location => {
                        location.value = null;
                    });
                    res.render('user/overview', {user: JSON.stringify(foundUser), locations: JSON.stringify(foundLocations)});
                }
            });
        }
    });
});

router.get('/:id/branches', middleware.checkOwnership, function(req, res){
    User.findById(req.params.id).populate('branches').exec(function(err, foundUser){
        if(err){
            console.log("ERR - User not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            res.redirect('/');
        }else{
            Location.find(function(err, foundLocations){
                if(err){
                    console.log("ERR - User not found: " + err);
                    req.flash('error', "Error, try again later or contact us!");
                    res.redirect('/');  
                }else{
                    res.render('user/branches', {user: JSON.stringify(foundUser), locations: JSON.stringify(foundLocations)});
                }
            })
        }
    });
});

router.post('/:id/update', middleware.checkOwnership, function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        if(err){
            console.log("ERR - User not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            res.redirect('/users/' + req.params.id + '/settings');
        }else{
            var updateUsername = false;
            var updateMail = false;
            async.series([
                function(done){
                    if(foundUser.username != req.body.username){
                        User.findOne({username: req.body.username}, function(err, userWithUsername){
                            if(err){
                                req.flash('error', 'Error updating the username. Try again later.');
                                return done(err);
                            }else{
                                if(userWithUsername){
                                    req.flash('error', 'A user with this username already exisits.');
                                    return done();
                                }else{
                                    updateUsername = true;
                                    return done();
                                }
                            }
                        });
                    }else{
                        done();
                    }

                }, 
                function(done){
                    if(foundUser.mail != req.body.mail){
                        onlyUsernameUpdated = false;
                        User.findOne({mail: req.body.mail}, function(err, userWithMail){
                            if(err){
                                req.flash('error', 'Error updating the username. Try again later.');
                                return done(err);
                            }else{
                                if(userWithMail){
                                    req.flash('error', 'A user with this mail already exists.');
                                    return done();
                                }else{
                                    updateMail = true;
                                    return done();
                                }
                            }
                        });
                    }else{
                        done();
                    }
                },
                function(done){
                    if(updateUsername){
                        foundUser.username = req.body.username;
                    }
                    if(updateMail){
                        foundUser.mail = req.body.mail;
                        foundUser.mailConfirmed = false;
                        foundUser.currentCode = generateCode();
                        resendCode(req);
                    }
                    foundUser.chainName = req.body.chainName;
                    foundUser.save();
                    done();
                }
            ],function(err){
                req.logIn(foundUser, function(err){
                    if(err){
                        req.flash('error', 'Something went wrong.');
                        return res.redirect('back');
                    }
                    req.flash('success', 'Update successful')
                    res.redirect('/users/' + req.params.id + '/settings');
                });
            })


        }
    });
});

router.post('/:id/delete', middleware.checkOwnership, function(req, res){
    User.findByIdAndRemove(req.params.id, function(err, foundUser){
        if(err){
            console.log("ERR - User not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            res.redirect('/users/' + req.params.id + '/settings');
        }else{
            foundUser.branches.forEach(branch => {
                Branch.findByIdAndRemove(branch._id, function(err, foundBranch){});
            });
            req.flash('success', "You're account has been deleted");
            res.redirect('/');
        }
    });
});


router.get('/:id/branches/new', middleware.checkOwnership, function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        if(err){
            console.log("ERR - User not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            res.redirect('/');
        }else{
            Location.find(function(err, foundLocations){
                if(err){
                    console.log("ERR - No locations found: " + err);
                    req.flash('error', "Error, try again later or contact us!");
                    res.redirect('/');
                }
                else{
                    var i = 0;
                    var countries = [];
                    var cities = {};
                    var length = foundLocations.length;

                    foundLocations.sort(function(a,b){
                        if(a.country < b.country) return -1;
                        if(a.country > b.country) return 1;
                        return 0;
                    });

                    foundLocations.forEach(location => {
                        i++;
                        currentCity = {};
                        currentCity = {name: location.city, value: location.value, visitors: location.visitors, beds: location.beds};
                        if(countries.indexOf(location.country) === -1){
                            countries.push(location.country);                            
                            cities[location.country] = [currentCity];
                        }
                        else{
                            cities[location.country].push(currentCity);
                        }
                        if(i == length){
                            countriesJson = JSON.stringify(countries);
                            citiesJson = JSON.stringify(cities)
                            res.render('user/newbranch', {user: foundUser, countries: countriesJson, cities: citiesJson});
                        }                        
                    });

                }
            })
        }
    });
});

//Buying a branch
router.post('/:id/branches/new', middleware.checkOwnership, function(req, res){
    if(req.body.city == null || req.body.beds == null || req.body.stars == null){
        req.flash("error", 'Something went wrong. Try again.');
        res.redirect('/');
    }else{
        User.findById(req.params.id, function(err, foundUser){
            if(err){
                console.log("ERR - User not found: " + err);
                req.flash('error', "Error, try again later or contact us!");
                res.redirect('/');
            }else{
                Location.findOne({city: req.body.city}, function(err, foundLocation){
                    if(err){
                        console.log("ERR - Location not found: " + err);
                        req.flash("Error, try again later or contact us!");
                        res.redirect('/');
                    }else{
                        var newBranch = new Branch({city: req.body.city, beds: req.body.beds, stars: req.body.stars, priceFactor: '1'});
                        var price = calcBranchPrice(foundLocation.value, req.body.stars, req.body.beds);
                        price *= req.body.times;
                        if(price > foundUser.cash){
                            req.flash("You don't have enough money.");
                            res.redirect("/users/" + req.user._id + "/branches/nes");
                        }else{
                            foundUser.cash -= price;
                            for (let i = 0; i < req.body.times; i++) {
                                foundUser.branches.push(newBranch);
                                foundLocation.branches.push(newBranch);
                            }
                            foundUser.save();
                            foundLocation.save();
                            newBranch.save();
                            req.flash("success", "Congratulations! You own a new branch in " + req.body.city + "!");
                            res.redirect('/users/' + req.params.id + '/branches');
                        }
                    }
                });
            }
        });
    }
});


router.get('/:id/settings', middleware.checkOwnership, function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        if(err){
            console.log("ERR - User not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
        }else{
            res.render('user/settings', {user: foundUser});

        }
    })
});


//Create new User
router.post('/', function(req, res){
    var code = generateCode();
    
    var transporter = nodemailer.createTransport({
        host: 'mail.privateemail.com',
        port: 465,
        auth:{

        }
    });

    if(req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
        req.flash('error', 'Captcha failed. Try again later!');
        res.render('register');
    }else{
        var secretKey = ""; //Add the secret recaptcha key
        var verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;

        request(verificationUrl,function(error,response,body) {
            body = JSON.parse(body);
            // Success will be true or false depending upon captcha validation.
            if(body.success !== undefined && !body.success) {
              req.flash('error', 'Captcha failed.');
              res.render('register');
            }else{
                if(req.body.password !== req.body.passwordConfirm){
                    //Check if passwords match
                    req.flash('error', 'Passwords do not match');
                    res.redirect('/register');
                }else{
                    var newUser = new User({username: req.body.username, mail: req.body.mail, currentCode: code});
                    if(req.body.invitation){
                        newUser.invitedby = req.body.invitation;
                    }
                    User.find({mail: req.body.mail}, function(err, foundUser){
                        if(foundUser.length){
                            req.flash("error", "An account with this mail already exists.");
                            res.redirect("/register");
                        }else{
                            User.find({username: req.body.username}, function(err, foundUser){
                                if(foundUser.length){
                                    req.flash("error", "This username exists already!");
                                    res.redirect("/register");
                                }else{
                                    User.register(newUser, req.body.password, function(err, user){
                                        if(err){
                                            console.log("ERR - New user creation failed: " + err);
                                            req.flash('error', "Error creating your account. Please try again or contact us!");
                                            res.redirect("/register");
                                        }else{
                                            var mailOptions = {
                                                from: '"Polypol"<info@polypol.io>',
                                                to: newUser.mail,
                                                subject: "Welcome to Polypol.io " + newUser.username + "!",
                                                html: `<html><h1> Welcome to Polypol.io </h1> <br> Confirm your mail to use all features: https://${req.headers.host}/users/${user._id}/confirm/${user.currentCode} </html>`,
                                                text: `Welcome to Polypol.io \n Confirm your mail to use all features: https://${req.headers.host}/users/${user._id}/confirm/${user.currentCode}`
                                            }
                                            transporter.sendMail(mailOptions, function(err, info){
                                                if(err){
                                                    console.log("ERR - Failed sending mail: " + err);
                                                }else{
                                                    console.log("INFO - Mail sent: " + info.response);
                                                }
                                            });
                                            passport.authenticate('local')(req, res, function(){
                                                req.flash('success', "Hello " + user.username + "!");
                                                res.redirect('/');
                                            });
                                        }
                                    });
                                }
                            });    
                        }
                    });
                }
            }
        });
    }
});


router.post('/authenticate', passport.authenticate('local',
    {
        failureRedirect:'/login',
        failureFlash: true
    }), function(req, res){
        req.flash('success', 'Login successful!');
        res.redirect('/users/' + req.user._id)
});

router.post('/resendConfirmation', function(req, res){
    resendCode(req);
    req.flash("success", "Mail send to " + req.user.mail);
    res.redirect('/users/' + req.user._id + '/settings');
})

function resendCode(req){
    User.findById(req.user._id, function(err, user){
        var transporter = nodemailer.createTransport({
            host: 'mail.privateemail.com',
            port: 465,
            auth:{

            }
        });
        var mailOptions = {
            from: '"Polypol"<info@polypol.io>',
            to: user.mail,
            subject: "Confirmation code for Polypol.io",
            html: `<html><h1> Your confirmation code </h1> <br> Confirm your mail to use all features: https://${req.headers.host}/users/${user._id}/confirm/${user.currentCode}</html>`,
            text: `Your confirmation code \n Confirm your mail to use all features: https://${req.headers.host}/users/${user._id}/confirm/${user.currentCode}`
        }
        transporter.sendMail(mailOptions, function(err, info){
            if(err){
                console.log("ERR - Failed sending mail: " + err);
            }else{
                console.log("INFO - Mail sent: " + info.response);
            }
        });

    });
}

function generateCode(){
    return Math.floor(Math.random() * (999999 - 0 + 1))+ 0;
}

function calcBranchPrice(basePrice, stars, beds){
    return parseInt(parseFloat(basePrice) + parseFloat(basePrice * stars ** 4) + parseFloat(beds * 0.01 * basePrice) * 1000);
}


module.exports = router;