var middlewareObj = {};
var User = require('../models/user');

middlewareObj.requireHTTPS = function(req, res, next){
    if (!req.secure && req.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV !== "development") {
        return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
}

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }else{
        req.flash('error', 'Log in or register to view this content.');
        res.redirect('/login');
    }
};


middlewareObj.checkOwnership = function(req, res, next){
    if(req.isAuthenticated()){
        if(req.user._id == req.params.id){
            return next();
        }else{
            req.flash('error', 'You are not allowed to view this content!');
            res.redirect('/users/' + req.user._id);
        }
    }else{
        req.flash('error', 'Log in or register to view this content.');
        res.redirect('/login');
    }
}

middlewareObj.checkBranchOwnership = function(req, res, next){
    if(req.isAuthenticated()){
        User.findById(req.user.id, function(err, foundUser){
            if(err){
                req.flash('error', 'User not found.');
                res.redirect('/');
            }else{
                if(foundUser.branches.includes(req.params.id)){
                    return next();
                }else{
                    req.flash('error', 'You are not allowed to view this content!');
                    res.redirect('/users/' + req.user._id);
                }
            }
        })

    }else{
        req.flash('error', 'Log in or register to view this content.');
        res.redirect('/login');
    }
}

module.exports = middlewareObj;