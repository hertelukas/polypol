const express       = require('express'),
      router        = express.Router(),
      middleware    = require('../middleware'),
      bodyParser    = require('body-parser');

const User          = require('../models/user');

//These routes are only available if a user has set banker to true
router.get('/', middleware.isLoggedIn, function(req, res){
    var loans = [];
    var loanvalue = []
    var loan = req.user.netWorth[req.user.netWorth.length - 1] * 0.5;
    loans.push(formatter.format(loan));
    loanvalue.push(formatter.format(loan / 60 * 1.04));
    loan = loan * 0.2;
    loans.push(formatter.format(loan));
    loanvalue.push(formatter.format(loan / 48 * 1.07));
    loan = loan * 0.5;
    loans.push(formatter.format(loan));
    loanvalue.push(formatter.format(loan / 36 * 1.1));
    return res.render('bank', {loans: loans, loanvalue: loanvalue, cash: formatter.format(req.user.cash)});
});

//Route to take a loan
router.post('/take/:size', middleware.isLoggedIn, function(req, res){
    User.findById(req.user.id, function(err, foundUser){
        if(err || !foundUser){
            req.flash('error', 'Something went wrong.');
            return res.redirect('back');
        }
        if(foundUser.loansRemaining == 0){
            var months = 0;
            var toPay = 0;
            var cash = 0;
            if(req.params.size == 0){
                months = 36;
                cash = foundUser.netWorth[foundUser.netWorth.length - 1] * 0.05;
                toPay = cash / 36 * 1.1;
            }
            if(req.params.size == 1){
                months = 48;
                cash = foundUser.netWorth[foundUser.netWorth.length - 1] * 0.1;
                toPay = cash / 48 * 1.07;
            }
            if(req.params.size == 2){
                months = 60;
                cash = foundUser.netWorth[foundUser.netWorth.length - 1] * 0.5;
                toPay = cash / 60 * 1.04;
            }
            foundUser.cash += cash;
            foundUser.toPay = toPay;
            foundUser.netWorth[foundUser.netWorth.length - 1] += cash;
            foundUser.markModified('netWorth');

            foundUser.loansRemaining = months;
            foundUser.save();
            req.flash('success', `You got ${formatter.format(cash)}! You have to pay ${formatter.format(toPay)} for ${months} months`);
            return res.redirect('/bank'); 
        }else{
            req.flash('error', "You can't take a second loan!");
            return res.redirect('back'); 
        }
    });
});

var formatter = new Intl.NumberFormat('en-US',{
    style: 'currency',
    currency: 'USD',
});

module.exports = router;