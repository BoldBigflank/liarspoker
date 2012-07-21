var mongoose = require('mongoose')
require('./models')
var Game = mongoose.model("Game", Game);
var Player = mongoose.model("Player", Player);
var Bid = mongoose.model("Bid", Bid);
var config = require('./config')
var _ = require('underscore')

exports.getGame = function(name, cb){
	Game.findOne({'name':name}).populate('_bid').populate('_turn').exec(cb)
}

exports.join = function(gameId, id, cb){
	console.log("game.join", gameId, id) // Add the player to the game
	Player.findById(id).exec(function(err, player){
		if(!player){
			player = new Player({"_id":ObjectId(id)})
			player.save()
		} 
		// Give the person a hand
		while (player.hand.length < config.game.handSize) { player.hand.push( Math.floor(Math.random() * config.game.maxDie )) }
		player.save(function(err){
			Game.findById(gameId).populate('_bid').populate('_turn').exec(function(err, game){
				if(!game){
					game = new Game({name:gameId})
				}
				game.players.push(player)
				if(!game._turn) game._turn = player._id
				var bid = new Bid()
				bid.save()
				if(!game._bid) game._bid = (bid)._id
				game.save()
				cb(null, game)
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
	Game.findById(gameId).exec(function(err, game){
		game.players.id(id).name = name
		game.save(function(err){
			cb(err, game)
		})
	})
}

exports.bid = function(gameId, bid, cb){
	console.log("game.bid", gameId, bid) // Set the bid
	Game.findById(gameId).populate('_bid').populate('_turn').exec(function(err, game){
		// If it's the person's turn: set the bid, make the turn the next player's
		var bid = new Bid(bid)
		bid.save()
		game._bid = bid // Not sure how the populated object will handle this
		game.save(function(err){
			cb(err, game)
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

