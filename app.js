
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , mongoose = require('mongoose')
  , config = require('./config')
  , game = require('./game')
  , app = module.exports = express.createServer()
  , io = require('socket.io').listen(app)

mongoose.connect("mongodb://localhost:27017/liarspoker");
require('./models')
var Game = mongoose.model("Game", Game);

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
    if (typeof req.session.uuid === 'undefined') req.session.uuid = Math.floor(Math.random()*10000001)
    res.render(__dirname + '/views/index.jade', {title: "Meta4", uuid: req.session.uuid, game: new Game(), gameId: 'index'});
}); 

io.sockets.on('connection', function (socket) {
    console.log("Connection", socket.id)
    socket.emit('alert', "You have been alerted")
    
    // User enters
    socket.on('join', function(data){
        socket.set('uuid', data.uuid)
        socket.set('game', data.gameId)

        game.join(data.gameId, data.uuid, function(err, res){
            if (err) { socket.emit("alert", err) }
            else{ io.sockets.emit("game", res ) }
        })
    })

    // User places a bid
    socket.on('bid', function(data){
        console.log("bid called", data)
        socket.get('game', function(gameId){
            game.bid(gameId, data, function(game){
                io.sockets.emit('game', game)
            })
        })
    })

    // User calls liar
    socket.on('liar', function(data){
        socket.get('game', function(gameId){
            game.liar(gameId, data, function(game){
                io.sockets.emit('game', game)
            })
        })
    })

    // User requests next round
    socket.on('next', function(data){
        socket.get('game', function(gameId){
            game.liar(gameId, data, function(game){
                io.sockets.emit('game', game)
            })
        })
    })

})

var port = process.env.PORT || 3000
app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
