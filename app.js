const express       = require('express'),
      app           = express(),
      server        = require('http').createServer(app),
      io            = require('socket.io').listen(server),
      bodyParser    = require('body-parser'),
      mongoose      = require('mongoose'),
      passport      = require('passport'),
      LocalStrategy = require('passport-local'),
      middleware    = require('./middleware'),
      flash         = require('connect-flash');

const indexRoutes   = require('./routes/index.js'),
      userRoutes    = require('./routes/users.js'),
      branchRoutes  = require('./routes/branches.js'),
      chatRoutes    = require('./routes/chat.js'),
      bankRoutes    = require('./routes/bank.js');

const User          = require('./models/user'),
      Message       = require('./models/message');


//Connecting to the mongo database
mongoose.connect(process.env.DATABASEURL || "mongodb://localhost:27017/polypol", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false
}).then(() => {
  console.log('connected to the db!')
}).catch(err =>{
  console.log('Error connecting to the db: ' + err.message)
});

//Requiring express sessions
app.use(require('express-session')({
    secret: process.env.SECRET || "Please change me",
    resave: false,
    saveUninitialized: false
}));


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));
app.use(flash());
// app.use(middleware.requireHTTPS); //Uncomment this to redirect HTTP to HTTPS
require('dotenv').config({path: __dirname + '/.env'})

//Passport initialization
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Local variables, that can be used in every route
app.use(function(req, res, next){
    res.locals.currentUserJSON = JSON.stringify(req.user);
    res.locals.currentUser = req.user;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
});

//Requiring routes
app.use(indexRoutes);
app.use('/users', userRoutes);
app.use('/branches', branchRoutes);
app.use('/chat', chatRoutes);
app.use('/bank', bankRoutes);

//Handling Error 404
app.use(function(req, res, next){
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    res.render('404', { url: req.url });
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }
  // default to plain-text. send()
  res.type('txt').send('Not found');
});



//Setting up socket.io. Used for the live chat.
io.origins('*:*');

const users = {}; //All users currently connected to the chat
io.sockets.on('connection', (socket) => {
    socket.on('new-user', name => {
        users[socket.id] = name; //Storing new users
    });
    //Handling send messages
    socket.on('send-chat-message', message => { 
      var newMessage = new Message({message: message, sender: users[socket.id], time: Date.now()})
      newMessage.save();
        socket.broadcast.emit('chat-message', {message: message, name: users[socket.id]});
    });
});

var port = process.env.PORT || 3000;
server.listen(port, function(){
    console.log('Server has started on Port ' + port + ' in environment: ' + process.env.NODE_ENV);    
});