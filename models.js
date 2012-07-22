var mongoose = require('mongoose')
var config = require('./config')
var Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

var Player = new Schema({
      id        : ObjectId
    , name      : { type:String, default:'name'}
    , score     : { type:Number, default:config.game.buyin}
    , hand      : [{type: Number}]
})

var Bid = new Schema({
      player    : {type: String, default:null}
    , name      : {type: String, default:'initial'}
    , face      : {type: Number, default:'0'}
    , quantity  : {type: Number, default:'1'}
})

var Game = new Schema({
      id            : ObjectId
    , name        : {type: String, default: ''}
    , state         : {type: String, default: 'open'}
    , players       : [Player]
    , turn          : {type:String, default:null}
    , _bid          : { type: Schema.ObjectId, ref: 'Bid' }
})

mongoose.model("Game", Game);
mongoose.model("Player", Player);
mongoose.model("Bid", Bid);