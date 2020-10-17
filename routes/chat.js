const express       = require('express'),
      router        = express.Router(),
      middleware    = require('../middleware'),
      Message       = require('../models/message');



router.get('/', middleware.isLoggedIn, function(req, res){
    Message.find().sort({'time': -1}).limit(50).exec(function(err, foundMessages){
        if(err){
            console.log("ERR - User not found: " + err);
            req.flash("error", "Something went wrong. Try again later.");
            return res.redirect('back');
        }
        foundMessages.reverse();
        return res.render('chat', {messages: JSON.stringify(foundMessages)});
    });
});

module.exports = router;