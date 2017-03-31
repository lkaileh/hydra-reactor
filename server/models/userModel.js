const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

mongoose.Promise = global.Promise;

var Schema = mongoose.Schema;
var UserSchema = new Schema();
var ItinerarySchema = new Schema();
var TripSchema = new Schema({
  tripName: String,
  shortDescription: String,
  location: String,
  imageUrl: String,
  users: [UserSchema],
  itineraries: [ItinerarySchema]
});

var UserSchema = new Schema({
  firstName: String,
  lastName: String,
  email: {
    type: String,
    required: true,
    trim: true,
    // unique: true,
    validate: {
      isAsync: true,
      // NPM module to validate emails
      validator: validator.isEmail,
      message: '{VALUE} is not a valid email'
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 1 // Set to 1 for testing, update for production
  },
  tokens: [{
    access: {
      type: String
    },
    token: {
      type: String
    }
  }],
  trips: [TripSchema]
});

var ActivitySchema = new Schema({
  yelpBusinessName: String,
  yelpUrl: String,
  yelpRating: Number,
  yelpPriceRange: String,
  yelpID: String,
  yelpReviewCount: Number,
  yelpImage: String,
  totalLikes: Number,
  likedBy: [UserSchema],
  description: String,
  category: String
});

var ItinerarySchema = new Schema({
  startDate: Date,
  title: String,
  activities: [ActivitySchema]
});

// 'UserSchema.methods' is a collection of methods on the instance of the UserSchema

// Generate JWT tokens
UserSchema.methods.generateToken = function () {
  var user = this;
  var access = 'auth';
  var token = jwt.sign({_id: user._id.toString(), access}, 'somesecret');

  user.tokens.push({access, token});

  return user.save().then(() => {
    return token;
  });
};

UserSchema.methods.removeToken = function (token) {
  var user = this;

  return user.update({
    $pull: {
      tokens: {token}
    }
  });
};

// 'UserSchema.statics' is a collection of methods on the UserSchema model
UserSchema.statics.findByToken = function (token) {
  var User = this;
  var decoded;

  try {
    decoded = jwt.verify(token, 'somesecret');
  } catch (err) {
    return Promise.reject(err);
  }
  // find user by id and token
  return User.findOne({
    '_id': decoded._id,
    'tokens.token': token,
    'tokens.access': 'auth'
  });
};

// find user by email and password
UserSchema.statics.findByCredentials = function (email, password) {
  var User = this;

  return User.findOne({email}).then((user) => {
    if (!user) {
      console.log('Promise.reject');
      return Promise.reject();
    }
    // because bcrypt didn't support Promises, use generic Promise
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, (err, res) => {
        if (res) {
          resolve(user);
        } else {
          reject(err);
        }
      });
    });
  });
};

// Mongoose middleware, runs before each 'save'
UserSchema.pre('save', function (next) {
  var user = this;

  if (!user.isModified('password')) {
    return next();
  }
  // hash user password using salt 10 times
  bcrypt.hash(user.password, 10, (err, hash) => {
    if (err) {
      return next(err);
    }
    user.password = hash;
    next();
  });
});

var User = mongoose.model('User', UserSchema);

module.exports = User;
