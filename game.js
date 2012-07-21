var mongoose = require('mongoose')
require('./models')
var Game = mongoose.model("Game", Game);
var Player = mongoose.model("Player", Player);
var Bid = mongoose.model("Bid", Bid);
var config = require('./config')
var _ = require('underscore')

exports.init = function(){
	Game.find().remove()
	Player.find().remove()
	Bid.find().remove()
}

// exports.getGame = function(name, playerId, cb){
// 	Game.findOne({'name':name}).populate('_bid').populate('_turn').populate('_bid._player').exec(function(err, game){
// 		if(!game){
// 		    var bid = new Bid()
// 		    var turn = new Player({'_id':''})
// 		    game = new Game({'name':'index', '_bid':bid._id, '_turn':turn})
// 		    Player.findById(playerId, function(err, player){
// 		    	game.players.push(player)
// 		    	game.save(function(err){
// 		    		cb(err, game)
// 		    	})
// 		    })
// 		}
// 		else{
// 			if(!game.players.id(playerId)){
// 				game.players.push()
// 			}
// 		}
// 			cb(err, game)
// 	})
// }

exports.join = function(gameName, id, cb){
	console.log("game.join", gameName, id) // Add the player to the game
	Player.findById(id).exec(function(err, player){
		if(!player){
			player = new Player({"_id":ObjectId(id)})
			player.save()
		} 
		// Give the person a hand
		while (player.hand.length < config.game.handSize) { player.hand.push( Math.floor(Math.random() * config.game.maxDie +1 )) }
		player.save(function(err){
			Game.findOne({'name':gameName}).exec(function(err, game){
				if(!game){
					console.log("new game")
					game = new Game({name:gameName})
					game.save(function(err){

					})
				}
				game.players.push(player)
				if(!game._turn) game._turn = player
				var bid = new Bid()
				bid.save()
				if(!game._bid) game._bid = bid
				game.save(function(err){
					Game.findById(game._id).populate('_bid').populate('_turn').exec(function(err, game){
						cb(null, game)
					})
				})
				
			})
		})
	})
}

exports.leave = function(gameId, id, cb){
	console.log("game.leave", gameId, id)
	Game.findById(gameId).populate('_bid').populate('_turn').exec(function(err, game){
		if(!game) return cb("Game not found")
		Player.findById(id).exec(function(err, player){
			if(err) cb(err)
			if(game.players.id(player._id)){
				game.players.id(player._id).remove()
			}
			game.save(function(err){
				cb(err, game)
			})
		})

	})
}

exports.name = function(gameId, id, name, cb){
	Game.findById(gameId).populate('_bid').populate('_turn').exec(function(err, game){
		game.players.id(id).name = name
		game.save(function(err){
			cb(err, game)
		})
	})
}

exports.bid = function(gameId, bid, cb){
	console.log("game.bid", gameId, bid) // Set the bid
	Game.findById(gameId).exec(function(err, game){
		// If it's the person's turn: set the bid, make the turn the next player's
		var bidObject = new Bid(bid)
		bidObject.save()
		game._bid = bidObject._id // Not sure how the populated object will handle this
		// Next player is it
		var players = _.map(game.players, function(val, key){console.log(val._id, game._turn); return val._id.toString() })
		var i = _.indexOf(players, game._turn.toString())
		console.log("I is ", i)
		game._turn = game.players[(i+1) % game.players.length]
		game.save(function(err){
			Game.findById(game._id).populate('_bid').populate('_turn').exec(cb)
		})
	})
}

exports.liar = function(gameId, liar, cb){
	console.log("game.liar", gameId, liar) // End the round, determine winner
	Game.findById(gameId).populate('_bid').populate('_turn').exec(function(err, game){
		// Winner is either turn or bid


		// Winner is placed in turn
		game.state = 'result'
		game.save(function(err){
			cb(err, game)	
		})
		
	})
}

exports.next = function(gameId, cb){
	console.log("game.next", gameId)
	Game.findById(gameId).populate('_bid').populate('_turn').exec(function(err, game){
		game.state = 'open'
		var bid = new Bid()
		game._bid = bid
		game.save(function(err){
			cb(err, game)	
		})
	})	
	cb()
}

