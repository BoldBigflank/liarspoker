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
	Game.findOne({'name':gameName}).exec(function(err, game){
		if(!game){
			console.log("new game")
			game = new Game({name:gameName})
			game.save()
		}
		var player = game.players.id(id)
		if(!player){
			player = new Player({"_id": id} )
			// Give the person a hand
			while (player.hand.length < config.game.handSize) { player.hand.push( Math.floor(Math.random() * config.game.maxDie +1 )) }
			game.players.push(player)
		}
		if(!game.turn) game.turn = player._id.toString()
		var bid = new Bid()
		bid.save()
		if(!game._bid) game._bid = bid
		game.save(function(err){
			Game.findById(game._id).populate('_bid').exec(function(err, game){
				cb(null, game)
			})
		})
	})
}

exports.leave = function(gameId, id, cb){
	console.log("game.leave", gameId, id)
	Game.findById(gameId).populate('_bid').exec(function(err, game){
		if(!game) return cb("Game not found")
		var player = game.players.id(id)
		if(player){
			console.log("Found the player", player)
			if(game.turn == player._id.toString()){
				if(game.players.length <= 1)
					game.turn = null
				else{
					var players = _.map(game.players, function(val, key){; return val._id.toString() })
					var i = _.indexOf(players, game.turn)
					game.turn = game.players[(i+1) % game.players.length]._id.toString()	
				}
			}
			game.players.id(id).remove()
			game.save(function(err){
				Game.findById(game._id).populate('_bid').exec(cb)
			})			
		}
	})
}

exports.name = function(gameId, id, name, cb){
	Game.findById(gameId).exec(function(err, game){
		console.log("Game", game)
		game.players.id(id).name = name
		game.save(function(err){
			Game.findById(game._id).populate('_bid').exec(cb)
		})

	})
}

exports.bid = function(gameId, uuid, bid, cb){
	console.log("game.bid", gameId, bid) // Set the bid
	Game.findById(gameId).exec(function(err, game){
		// If it's the person's turn: set the bid, make the turn the next player's
		var bidObject = new Bid(bid)
		bidObject._player = uuid
		bidObject.save()
		// Next player is it
		game._bid = bidObject._id // Not sure how the populated object will handle this
		var players = _.map(game.players, function(val, key){; return val._id.toString() })
		var i = _.indexOf(players, game.turn)
		game.turn = game.players[(i+1) % game.players.length]._id.toString()
		game.save(function(err){
			Game.findById(game._id).populate('_bid').exec(cb)
		})
	})
}

exports.challenge = function(gameId, uuid, cb){
	console.log("game.challenge", gameId, uuid) // End the round, determine winner
	Game.findById(gameId).populate('_bid').populate('_bid._player').exec(function(err, game){
		console.log(game.turn, uuid)
		if(game.turn == uuid)
			cb("It is not your turn")
		// Gather all the hands
		var allDice = []
		_.each(game.players, function(player){ allDice = allDice.concat(player.hand) })
		var totalQuantity = 0
		_.each(allDice, function(num){ if(num == game._bid.face) totalQuantity += 1})
		var winner = (game._bid.quantity >= totalQuantity) ? game._bid._player._id : game.turn
		var spoils = game.players.length - 1
		
		_.each(game.players, function(player){
			// If the bidder
			if(player._id == winner)
				player.score += (game._bid.quantity >= totalQuantity) ? spoils : -1
			// If the challenger
			else if(player._id == winner)
				player.score += (game._bid.quantity >= totalQuantity) ? -1 : spoils
			else
				player.score += -1
			player.save()
			// Else
		})
		game.turn = winner
		game.winner = winner
		game.state = 'result'
		game.save(function(err){
			cb(err, game)	
		})
		
	})
}

exports.next = function(gameId, cb){
	console.log("game.next", gameId)
	Game.findById(gameId).populate('_bid').exec(function(err, game){
		game.state = 'open'
		var bid = new Bid()
		game._bid = bid
		game.save(function(err){
			cb(err, game)	
		})
	})	
	cb()
}

