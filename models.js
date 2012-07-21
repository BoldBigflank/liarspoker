var mongoose = require('mongoose')
var Schema = mongoose.Schema
    , ObjectId = Schema.ObjectId;

var Player = new Schema({
      id        : ObjectId
    , name      : String
    , score     : { type:Number, default:0}
    , hand      : [{type: Number}]
})

var Bid = new Schema({
      _player   : {type: Schema.ObjectId, ref: 'Player'}
    , face      : {type: String, default:'0'}
    , quantity  : {type: String, default:'0'}
})

var Game = new Schema({
      id            : ObjectId
    , name          : {type: String, default: ''}
    , state         : {type: String, default: 'open'}
    , players       : [Player]
    , _turn         : { type: Schema.ObjectId, ref: 'Player' }
    , _bid          : { type: Schema.ObjectId, ref: 'Bid' }
})

mongoose.model("Game", Game);
mongoose.model("Player", Player);
mongoose.model("Bid", Bid);