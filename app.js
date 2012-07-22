
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , mongoose = require('mongoose')
  , config = require('./config')
  , liarspoker = require('./game')
  , app = module.exports = express.createServer()
  , io = require('socket.io').listen(app)

mongoose.connect("mongodb://localhost:27017/liarspoker");
require('./models')
var Game = mongoose.model("Game", Game);
var Player = mongoose.model("Player", Player)
var Bid = mongoose.model("Bid", Bid)
liarspoker.init()
// Configuration

app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', { layout: false });
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.session({ secret: "dandelion sneezes" }));
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', function (req, res) {
    if (typeof req.session.uuid === 'undefined'){
        req.session.uuid = mongoose.Types.ObjectId()
    }
    res.render(__dirname + '/views/index.jade', {title: "Liar's Poker", uuid: req.session.uuid, gameName: 'index'});
}); 

io.sockets.on('connection', function (socket) {
    console.log("Connection", socket.id)
    socket.emit('alert', "You have been alerted")
    socket.on('disconnect', function(){
        socket.get('game', function(err, gameId){
            if(err) return
            socket.get('uuid', function(err, uuid){
                if(err) return
                liarspoker.leave(gameId, uuid, function(err, game){
                    io.sockets.emit('game', game)
                })
            })
        })
    })
    // User enters
    socket.on('join', function(data){
        socket.set('uuid', data.uuid)
        
        liarspoker.join(data.gameName, data.uuid, function(err, game){
            if (err) { socket.emit("alert", err) }
            else{
                socket.set('game', game._id.toString())
                io.sockets.emit("game", game ) 
            }
        })
    })

    // Player changes their name
    socket.on('name', function(name){
        socket.get('game', function(err, gameId){
            if(err) return
            socket.get('uuid', function(err, uuid){
                if(err) return
                liarspoker.name(gameId, uuid, name, function(err, game){
                    io.sockets.emit('game', game)
                })
            })
        })
    })

    // User places a bid
    socket.on('bid', function(data){
        console.log("bid called", data)
        socket.get('game', function(err, gameId){
            socket.get('uuid', function(err, uuid){
                liarspoker.bid(gameId, uuid, data, function(err, game){
                    io.sockets.emit('game', game)
                    socket.emit('alert', "Bid called")
                })
            })
        })
    })

    // User calls liar
    socket.on('challenge', function(data){
        socket.get('game', function(err, gameId){
            socket.get('uuid', function(err, uuid){
                liarspoker.challenge(gameId, uuid, function(err, game){
                    if(err) socket.emit('alert', err)
                    io.sockets.emit('game', game)
                })
            })
        })
    })

    // User requests next round
    socket.on('next', function(data){
        socket.get('game', function(err, gameId){
            liarspoker.next(gameId, function(err, game){
                if(err) socket.emit('alert', err)
                io.sockets.emit('game', game)
            })
        })
    })
    socket.on('reset', function(data){
        socket.get('game', function(err, gameId){
            liarspoker.reset(gameId, function(err, game){

            })
        })
    })
})

var port = process.env.PORT || 3000
app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
