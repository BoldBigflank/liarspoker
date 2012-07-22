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

exports.join = function(gameName, id, cb){
	if(!id) id = mongoose.Types.ObjectId()
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
			Game.findById(game._id).populate('_bid').exec(cb)
		})
	})
}

exports.leave = function(gameId, id, cb){
	console.log("game.leave", gameId, id)
	Game.findById(gameId).populate('_bid').exec(function(err, game){
		if(!game) return cb("Game not found")
		var player = game.players.id(id)
		if(player){
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
		bidObject.player = uuid
		bidObject.save()
		// Next player is it
		game._bid = bidObject // Not sure how the populated object will handle this
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
	Game.findById(gameId).populate('_bid').exec(function(err, game){
		if(game.turn != uuid){
			cb("It is not your turn")
			return
		}
		// Gather all the hands
		var allDice = []
		_.each(game.players, function(player){ allDice = allDice.concat(player.hand) })
		var totalQuantity = 0
		_.each(allDice, function(num){ if(num == game._bid.face) totalQuantity += 1})
		var winner = (game._bid.quantity > totalQuantity) ? game.turn : game._bid.player // challenger : bidder
		var spoils = game.players.length - 1
		
		_.each(game.players, function(player){
			player.score += (player._id.toString() == winner) ? spoils : -1
		})

		game.turn = winner
		game.state = 'result'
		game.bid = new Bid()
		game.save(function(err){
			Game.findById(game._id).populate('_bid').exec(cb)
		})
		
	})
}

exports.next = function(gameId, cb){
	console.log("game.next", gameId)
	Game.findById(gameId).populate('_bid').exec(function(err, game){
		// Give the players new hands
		_.each(game.players, function(player){
			player.hand.length = 0
			player.hand = new Array()
			while (player.hand.length < config.game.handSize) { player.hand.push( Math.floor(Math.random() * config.game.maxDie +1 )) }
		})
		game.state = 'open'
		var bid = new Bid()
		bid.save()
		game._bid = bid
		game.save(function(err){
			Game.findById(game._id).populate('_bid').exec(cb)
		})
	})
}