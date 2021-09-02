//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const homeStartingContent = "Welcome to your online personalised diary";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret:"our little secret",
   resave: false,
   saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());




mongoose.connect("mongodb://localhost:27017/blogDB", {useNewUrlParser: true , useUnifiedTopology: true });
mongoose.set("useCreateIndex",true);
const postSchema = new mongoose.Schema({

  title: String,
  content: String,
  date:String,
   UID:String
  
});

const Post = mongoose.model("Post", postSchema);
const userSchema =new mongoose.Schema({
  username: {type: String},
  googleId: {
    type: String,
  },
  password: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
})
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = mongoose.model("User", userSchema);


passport.use(User.createStrategy());


passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
      done(err, user);
  });
});


passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/Diario"
},
function (accessToken, refreshToken, profile, cb) {
  // console.log(profile);

  User.findOrCreate(
    {
      googleId: profile.id,
    },
    function (err, user) {
      return cb(err, user);
    }
  );
}
)
);

app.get("/", function(req,res){
  res.render("login");
});
app.get("/register", function(req,res){
  res.render("register");
});


app.get("/auth/google", passport.authenticate('google',{ scope: ["profile"] })
);
app.get('/auth/google/Diario', 
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/home');
  });
  app.post("/", function (req, res) {
  
  
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });
  
    User.findOne({ username: req.body.username }, function (err, user) {
      if (err) {
        console.log(err);
      }
      if(!user){
       
        res.redirect("/register");
      }
      else {
        req.login(user, function (err) {
          if (err) {
            console.log(err);
          } else {
            passport.authenticate("local")(req, res, function () {
              res.redirect("/home");
            });
          }
        });
      }
    })
  }
  );
  

  

app.get("/logout", function(req,res){
  req.logout();
  res.render("home");
});
app.post("/register", function(req,res){
 User.register({username: req.body.username}, req.body.password, function(err,user){
   if(err){
     console.log(err);
     res.redirect("/register");
   }else{
     passport.authenticate("local")(req,res,function(){
       res.redirect("/home");
     });
   }
 })
  
  });

  app.get("/home", function(req, res){
    if(req.isAuthenticated()){
      User.findById(req.user.id, function (err, foundUser) {
        if (err) {
          console.log(err);
        } else {
          if (foundUser)
      {Post.find({UID: foundUser._id},function(err, foundPosts){
        if(err){
          console.log(err)
        }
        else{
          res.render("home", {
              homeStartingContent: homeStartingContent, 
                posts: foundPosts,
                
          });
        }
      });}

    }
  });
     
   
    }else{
      res.redirect("/");
    }
  }); 
  
app.get("/compose", function(req, res){
  res.render("compose");
});

app.post("/compose", function(req, res){
let date = new Date();
let postdate= date.toString();

  const post = new Post ({
   date:postdate,
    title: req.body.postTitle,
    content: req.body.postBody,
    UID: req.user.id
  });
  User.findById(req.user.id, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        post.save(function (err) {
          if (!err) {
            res.redirect("/home");
          }
        });
      }
    }
  });
});


app.post("/delete", function (req, res) {
  const deletedPost = req.body.deletedPost;
  Post.deleteOne({ _id: deletedPost }, function (err) {
    if (!err) {
      res.redirect("/home");
    }
  });
});


app.get("/posts/:postName", function(req, res){
  const requestedTitle = _.lowerCase(req.params.postName);

  posts.forEach(function(post){
    const storedTitle = _.lowerCase(post.title);

    if (storedTitle === requestedTitle) {
      res.render("post", {
        title: post.title,
        content: post.content
      });
    }
  });

});

app.get("/about", function(req, res){
  res.render("about", {aboutContent: aboutContent});
});

app.get("/contact", function(req, res){
  res.render("contact", {contactContent: contactContent});
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
