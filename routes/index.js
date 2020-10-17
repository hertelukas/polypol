const express       = require('express'),
      router        = express.Router(),
      async         = require('async'),
      crypto        = require('crypto'),
      nodemailer    = require('nodemailer'),
      middleware    = require('../middleware'),
      bodyParser    = require('body-parser'),
      request       = require('request');

    
const User          = require('../models/user'),
      Branch        = require('../models/branch'),
      Location      = require('../models/location'),
      News          = require('../models/news');
const { use } = require('passport');

router.use(bodyParser.urlencoded({extended: true}));

router.get('/', function(req, res){
    res.render('landing'); 
});

router.get('/contact', function(req, res){
    res.render('contact');
});

router.post('/contact', function(req, res){
    if(req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
        req.flash('error', 'Captcha failed. Try again later!');
        return res.redirect('/contact');
    }else{
        var secretKey = ""; //Add the secret key from google recaptcha
        var verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;

        request(verificationUrl,function(error,response,body) {
            body = JSON.parse(body);
            // Success will be true or false depending upon captcha validation.
            if(body.success !== undefined && !body.success) {
              req.flash('error', 'Captcha failed.');
              res.render('register');
            }else{
                if(req.body.name && req.body.mail && req.body.message){
                    //Log into the mail server
                    var transporter = nodemailer.createTransport({
                        host: 'mail.privateemail.com',
                        port: 465,
                        auth:{
                            //Login to you mail
                        }
                    });
                    var mailOption = {
                        to: '', //The one who wants to read the contact form
                        from: '"Polypol"<info@polypol.io>',
                        subject: 'Polypol Message',
                        text: req.body.name + '\n' + req.body.message + '\n' + req.body.mail
                    };
                    transporter.sendMail(mailOption, function(err, info){
                        if(err){
                            console.log("ERR - Failed sending mail: " + err);
                            req.flash('error', "There was an error sending you the e-mail. Try again later or contact us.");
                            return res.redirect('/contact');
                        }else{
                            console.log("INFO - Mail sent: " + info.response);
                            req.flash('success', 'We have received your message! We will write you back as soon as possible.');
                            return res.redirect('/');
                        }
                    });
                }
            }
        });
    }
});

router.get('/register', function(req, res){
    if(req.user){
        res.redirect('/users/' + req.user._id);
    }else{
        res.render('register');
    }
});

router.get('/login', function(req, res){
    if(req.user){
        res.redirect('/users/' + req.user._id);
    }else{
        res.render('login');
    }
});

router.get('/leaderboard', function(req, res){
    User.find(function(err, foundUsers){
        if(err){
            console.log("ERR - Failed finding users: " + err);
            req.flash("error", 'Something went wrong.')
            return res.redirect('/')
        }
        users = [];
        var i = 0;
        
        foundUsers.sort(function(a, b){
            if(parseFloat(a.netWorth) > parseFloat(b.netWorth)) return -1;
            if(parseFloat(a.netWorth) < parseFloat(b.netWorth)) return 1;
            return 0;
        });

        for(let user of foundUsers){
            i+=1;
            var userObject = {};
            userObject.name = user.chainName;
            userObject.net = user.netWorth[user.netWorth.length - 1];
            userObject.id = user._id;
            userObject.beds = user.branches.length;
            userObject.sponsor = user.sponsor;

            if(user.branches.length > 0) users.push(userObject);
            if(i == foundUsers.length){
                if(req.user){
                    res.render('leaderboard', {users: JSON.stringify(users), currentUserId: JSON.stringify(req.user._id)});
                }else{
                    res.render('leaderboard', {users: JSON.stringify(users), currentUserId: null});
                }
            }
        }
    });
});

router.get('/logout', function(req, res){
    req.logout();
    req.flash('success', 'You are now logged out!');
    res.redirect('/');
});

router.get('/forgot', function(req, res){
    res.render('forgot');
});

router.post('/forgot', function(req, res){
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf){
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function(token, done){
            User.findOne({mail: req.body.mail}, function(err, user){
                if(!user){
                    req.flash('error', "We couldn't find an account with this address.");
                    return res.redirect('/forgot');
                }

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; //one hour
                user.save(function(err){
                    done(err, token, user);
                });
            });
        },
        function(token, user, done){
            var transporter = nodemailer.createTransport({
                host: 'mail.privateemail.com',
                port: 465,
                auth:{

                }
            });
            var mailOption = {
                to: user.mail,
                from: '"Polypol"<info@polypol.io>',
                subject: 'Polypol Password Reset',
                html: '<html><h1>Password Reset </h1> \n'+
                    'Password Reset<br>'+
                    'Please click on the following link, or paste this into your browser to complete the process: <br>' +
                    'https://' + req.headers.host + '/reset/' + token + '<br>' + 
                    'If you did not request this, please ignore this email. Your password will remain unchanged.</html>',

                text: `Password Reset \n Please click on the following link, or paste this into your browser to complete the process: \n` + 
                    'https://' + req.headers.host + '/reset/' + token + '\n' + 
                    'If you did not request this, please ignore this email. Your password will remain unchanged.',
            };
            transporter.sendMail(mailOption, function(err, info){
                if(err){
                    console.log("ERR - Failed sending mail: " + err);
                    req.flash('error', "There was an error sending you the e-mail. Try again later or contact us.");
                    return res.redirect('/forgot');
                }else{
                    console.log("INFO - Mail sent: " + info.response);
                    req.flash('success', 'An e-mail has been sent to ' + user.mail + ' with further instructions.');
                    done(err, 'done');
                }
            });
        }
    ], function(err){
        if(err) return next(err);
        res.redirect('/forgot');
    });
});

router.get('/reset/:token', function(req, res){
    User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}, function(err, foundUser){
        if(!foundUser){
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot');
        }
        res.render('reset', {token: req.params.token});
    });
});

router.post('/reset/:token', function(req, res){
    async.waterfall([
        function(done){
            User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now()}}, function(err, foundUser){
                if(!foundUser){
                    req.flash('error', 'Password reset token is invalid or has expired.');
                    return res.redirect('back');
                }

                if(req.body.password == req.body.confirm && req.body.password.length >= 6){
                    foundUser.setPassword(req.body.password, function(err){
                        foundUser.resetPasswordToken = undefined;
                        foundUser.resetPasswordExpires = undefined;

                        foundUser.save(function(err){
                            req.logIn(foundUser, function(err){
                                done(err, foundUser);
                            });
                        });
                    });
                }else{
                    req.flash('error', 'Passwords do not match.');
                    return res.redirect('back');
                }
            });
        },
        function(user, done){
            var transporter = nodemailer.createTransport({
                host: 'mail.privateemail.com',
                port: 465,
                auth:{

                }
            });
            var mailOption = {
                to: user.mail,
                from: '"Polypol"<info@polypol.io>',
                subject: 'Polypol Password Reset',
                html: '<html><h1>Hello ' + user.username + '</h1>'+
                    'This is a confirmation that the password for your account ' + user.mail + ' has just been updated.</html>',
                text: 'Hello ' + user.username + '\n' + 'This is a confirmation that the password for your account ' + user.mail + ' has just been updated.'
            };
            transporter.sendMail(mailOption, function(err, info){
                if(err){
                    console.log("ERR - Failed sending mail: " + err);
                    req.flash('error', "There was an error sending you the e-mail. Try again later or contact us.");
                    return res.redirect('/forgot');
                }else{
                    console.log("INFO - Mail sent: " + info.response);
                    req.flash('success', "You're password has been changed.");
                    done(err);
                }
            });
        }, function(err){
            res.redirect('/');
        }
    ]);
});String

router.get('/market', middleware.isLoggedIn, function(req, res){
    branches = [];
    Branch.find(function(err, foundBranches){
        var i = 0;
        var length = foundBranches.length;
        foundBranches.forEach(branch => {
            i++;
            if(branch.onSale){
                branch.profit = null;
                branch.staff = null;
                branch.interior = null;
                branches.push(branch);
            }
            if(i === length){
                User.findById(req.user._id, function(err, foundUser){
                    Location.find(function(err, foundLocations){
                        if(err){
                            console.log("ERR - Loaction not found: " + err);
                            req.flash('error', "Error, try again later or contact us!");
                            res.redirect('/');  
                        }else{
                            res.render('market', {user: JSON.stringify(foundUser), branches: JSON.stringify(branches), locations: JSON.stringify(foundLocations)});
                        }
                    });
                });
            }
        });
    });
});

router.get('/sell', middleware.isLoggedIn, function(req, res){
    User.findById(req.user._id).populate('branches').exec(function(err, foundUser){
        if(err){
            console.log("ERR - User not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            res.redirect('/');  
        }else{
            if(!foundUser.mailConfirmed){
                req.flash('error', "Please confirm your mail to sell branches.");
                return res.redirect('/users/' + req.user._id + '/settings');
            }
            Location.find(function(err, foundLocations){
                if(err){
                    console.log("ERR - Loaction not found: " + err);
                    req.flash('error', "Error, try again later or contact us!");
                    res.redirect('/');  
                }else{
                    res.render('sell', {user: JSON.stringify(foundUser), locations: JSON.stringify(foundLocations)});
                }
            });
        }
    });
});

router.post('/sell/:id', middleware.checkBranchOwnership, function(req, res){
    if(req.body.price){
        Branch.findById(req.params.id, function(err, foundBranch){
            if(err){
                console.log("ERR - Branch not found: " + err);
                req.flash('error', "Error, try again later or contact us!");
                res.redirect('/');  
            }else{
                foundBranch.onSale = true;
                foundBranch.salePrice = req.body.price;
                foundBranch.save();
                req.flash('success', "Your branch is now on sale!");
                res.redirect('/market');
            }
        });
    }else{
        console.log("ERR - User not found: " + err);
        req.flash('error', "Error, try again later or contact us!");
        res.redirect('/');  
    }
});

router.post('/buy/:id', middleware.isLoggedIn, function(req, res){
    Branch.findById(req.params.id, function(err, foundBranch){
        if(err){
            console.log("ERR - Branch not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            res.redirect('/');  
        }else{
            var price = foundBranch.salePrice;
            User.findById(req.user._id, function(err, buyer){
                if(err){
                    console.log("ERR - User not found: " + err);
                    req.flash('error', "Error, try again later or contact us!");
                    return res.redirect('/');  
                }
                if(buyer.mailConfirmed === false){
                    req.flash('error', "You have to confirm your mail to buy branches on the community market.");
                    return res.redirect('/users/' + buyer._id + '/settings');
                }
                //Check if enough money and buy
                if(price <= buyer.cash){
                    User.findOne({branches: req.params.id}, function(err, seller){
                        if(err){
                            console.log("ERR - User not found: " + err);
                            req.flash('error', "Error, try again later or contact us!");
                            res.redirect('/');  
                        }else{
                            buyer.branches.push(req.params.id);
                            buyer.cash -= price;
                            buyer.save();
                            seller.cash += price;
                            var index = seller.branches.indexOf(req.params.id);
                            if(index > -1)seller.branches.splice(index, 1);
                            seller.save();
                            foundBranch.autorenovate = buyer.autorenovate;
                            foundBranch.onSale = false;
                            foundBranch.salePrice = null;
                            foundBranch.save();
                            req.flash('success', 'Bought new branch!');
                            return res.redirect('/users/' + req.user._id + '/branches');
                        }
                    })
     
                }else{
                    req.flash('error', 'Not enough money.');
                    return res.redirect('/market');
                }
            });
        }
    });
});

router.post('/takeDown', middleware.isLoggedIn, function(req, res){
    Branch.findById(req.body.id, function(err, foundBranch){
        if(err){
            console.log("ERR - Branch not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            return res.redirect('/');  
        }
        if(foundBranch){
            foundBranch.onSale = false;
            foundBranch.salePrice = null;
            foundBranch.save();
            req.flash('success', 'Branch is no longer on sale');
            return res.redirect('back');
        }else{
            req.flash('error', 'Branch could not be found.');
            return res.redirect('back');
        }
    });
});

router.get('/privacy', function(req, res){
    return res.render('privacy');
});

router.get('/terms', function(req, res){
    return res.render('terms');
});

router.get('/locations', function(req, res){
    Location.find(function(err, locations){
        if(err){
            console.log("ERR - Location not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            return res.redirect('/locations');  
        }
        var totalVisitors = 0;
        var totalBeds = 0;
        locations.forEach(location => {
            location.branches = null;
            location.value = null;
            totalBeds += location.beds;
            totalVisitors += location.visitors;
        });
        return res.render('locations', {locations: JSON.stringify(locations), visitors: totalVisitors.toFixed(), beds: totalBeds.toFixed()});
    });
});

router.get('/locations/:id', function(req, res){
    Location.findById(req.params.id).populate('branches').exec(function(err, foundLocation){
        if(err || !foundLocation){
            console.log("ERR - Location not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            return res.redirect('/');  
        }
        var location = {};
        location.city = foundLocation.city;
        location.country = foundLocation.country;
        location.beds = 0;
        location.visitors = foundLocation.visitors.toFixed();
        location.branches = 0;
        totalStars = 0;
        totalProfit = 0;
        var profitperstar = [0,0,0,0,0,0,0];
        var counter = [0,0,0,0,0,0,0]


        foundLocation.branches.forEach(branch => {
            location.beds += branch.beds;
            location.branches += 1;
            totalStars += branch.stars;
            if(branch.profit.length > 0) totalProfit += branch.profit[branch.profit.length - 1] / branch.beds;

            if(branch.profit.length > 0){
                profitperstar[branch.stars] += branch.profit[branch.profit.length - 1];
                counter[branch.stars] += branch.beds;
            }
        });

        var profitperstarandbed = [];
        
        for (let i = 0; i < 7; i++) {
            profitperstarandbed[i] = (profitperstar[i] / counter[i]).toFixed(2);
        }
        location.avg_profit = totalProfit / location.branches;
        location.occupancy = (location.visitors / location.beds * 100).toFixed(2);
        if(location.occupancy > 100) location.occupancy = 100;
        location.avg_stars = (totalStars / location.branches).toFixed(2);
        if(isNaN(location.avg_stars)) location.avg_stars = '-';
        if(isNaN(location.avg_profit)) location.avg_profit = '-';
        else location.avg_profit = formatter.format(location.avg_profit);

        return res.render('location', {location: location, profitperstarandbed: JSON.stringify(profitperstarandbed), beds: JSON.stringify(counter)});

    });
});

router.get('/news', function(req, res){
    News.find(function(err, news){
        if(err){
            console.log("ERR - News not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            return res.redirect('/');  
        } 
        news.forEach(item => {
            item.dateValue = Date.parse(item.date);
        });

        news.sort(function(a,b){
            if(a.dateValue > b.dateValue) return -1;
            if(a.dateValue < b.dateValue) return 1;
            else return 0;
        })
        return res.render('news', {news: news});
    })
});

router.get('/visit/:id', function(req, res){
    User.findById(req.params.id).populate({path: 'branches', options: {limit: 20}}).exec(function(err, foundUser){
        if(err){
            console.log("ERR - User not found: " + err);
            req.flash('error', "Error, try again later or contact us!");
            return res.redirect('/');
        }else if(foundUser){
            var user = {};
            user.chainName = foundUser.chainName;
            User.findById(req.params.id, function(err, tempUser){user.totalBranches = tempUser.branches.length;}) 
            user.netWorth = foundUser.netWorth[foundUser.netWorth.length - 1];
            user.branches = foundUser.branches;
            user.branches = [];
            var i = foundUser.branches.length;    

            foundUser.branches.forEach(branch => {
                Location.findOne({"city": branch.city}, function(err, foundLocation){
                    if(err){
                        console.log("ERR - User not found: " + err);
                        req.flash('error', "Error, try again later or contact us!");
                        return res.redirect('/');
                    }
                    var tempBranch = {};
                    if(foundLocation){
                        tempBranch.cityid = foundLocation._id;
                    }
                    tempBranch.city = branch.city;
                    tempBranch.beds = branch.beds;
                    tempBranch.stars = branch.stars;
                    user.branches.push(tempBranch);
                    i--;
                    if(i == 0) return res.render('user/visit', {user: JSON.stringify(user)});
                });
            });
        }else{
            return res.render('404');
        }
    });
});

router.post('/theme', middleware.isLoggedIn, function(req, res){
    User.findById(req.user.id, function(err, foundUser){
        if(err || !foundUser){
            return res.redirect('back');
        }
        foundUser.dark = req.body.dark;
        foundUser.save();
        return res.redirect('back');
    });
});

router.get('/specialists', middleware.isLoggedIn, function(req, res){
    return res.render('specialists');
});

router.get('/hire', middleware.isLoggedIn, function(req, res){
    return res.render('hire');
});

router.post('/hire', middleware.isLoggedIn, function(req, res){
    User.findById(req.user.id, function(err, foundUser){
        if(err || !foundUser){
            req.flash('error', 'Something went wrong :(');
            return res.redirect('back');
        }else{
            foundUser[req.body.item] = true;
            foundUser.save();
            if(req.body.item == 'salesperson'){
                User.findById(req.user.id).populate('branches').exec(function(err, foundUserPopulated){
                    foundUserPopulated.branches.forEach(branch => {
                        branch.salesperson = true;
                        branch.save();
                    });
                })
            }
            req.flash('success', 'A ' + req.body.item + ' is now working for you!');
            return res.redirect('/specialists');
        }
    });
});

router.post('/fire', middleware.isLoggedIn, function(req, res){
    User.findById(req.user.id, function(err, foundUser){
        if(err || !foundUser){
            req.flash('error', 'Something went wrong :(');
            return res.redirect('back');
        }else{
            if(req.body.item == 'banker' && foundUser.loansRemaining > 0) {
                req.flash('error', "You can't fire you banker while having active loans.");
                return res.redirect('/specialists');
            }
            foundUser[req.body.item] = false;
            foundUser.save();
            if(req.body.item == 'salesperson'){
                User.findById(req.user.id).populate('branches').exec(function(err, foundUserPopulated){
                    foundUserPopulated.branches.forEach(branch => {
                        branch.salesperson = false;
                        branch.save();
                    });
                });
            }
            req.flash('success', 'A ' + req.body.item + ' is no longer working for you!');
            return res.redirect('/specialists');
        }
    });
});

router.get("/sponsors", function(req, res){
    User.find(function(err, foundUsers){
        if(err || !foundUsers){
            req.flash('error', 'Something went wrong :(');
            return res.redirect('back');
        }
        users = [];
        foundUsers.forEach(user => {
            if(user.sponsor){
                var userToPush = {};
                userToPush.id = user._id;
                userToPush.chainName = user.chainName;
                userToPush.sponsorMessage = user.sponsorMessage;
                users.push(userToPush);
            }
        });
        return res.render("sponsors", {users: JSON.stringify(users)});
    })
})

var formatter = new Intl.NumberFormat('en-US',{
    style: 'currency',
    currency: 'USD',
});

module.exports = router;