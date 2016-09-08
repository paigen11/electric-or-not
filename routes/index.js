var express = require('express');
var router = express.Router();

// 1. Connect to MongoDB.
var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient; 
//mongoClient already exists in the mongo documentation which
//we already connected to by connecting to mongodb on line 5
var mongoUrl = 'mongodb://localhost:27017/electric';
var db; //global so all of our routes have access to the db connection


mongoClient.connect(mongoUrl, function(error, database){
	if(error){
		console.log(error); //print out the error if there is one
	}else{
		db = database; //set the database object that was passed back to our callback
		console.log("Connected to Mongo successfully."); 
	}
});

/* GET home page. */

//General steps for the app

//Get all the pics into MongoDB
	// Done via the terminal
//Get all the pics from MongoDB
//Get the current user from Mongo
//Find out what pics the current user has voted on
//Load those pics into array
//Pick a random one
//Send the random one to EJS via a res.render('index', {picsArray})

router.get('/', function(req, res, next) {

	var userIp = req.ip
	// 5. find all the photos the user has voted on and load an array up with them
	db.collection('votes').find({ip:userIp}).toArray(function(error, userResult){
		var photosVoted = [];
		if(error){
			console.log('There was an error fetching user votes');
		}else{
			// console.log(userResult);
			for(var i = 0; i < userResult.length; i++){
				photosVoted.push(userResult[i].image);
			}
		}

	// 2. Get pics from Mongo and store them in an array to pass to view
	// 6. limit the query to photos not voted on
		db.collection('images').find({imgSrc: { $nin: photosVoted }}).toArray(function(error, photos){
			if(photos.length === 0){
				res.redirect('/standings');
			}else{
			// 3. Grab a random image from that array
			var randomNum = Math.floor(Math.random() * photos.length);
			var randomPhoto = photos[randomNum].imgSrc;
			// 4. Send that image to the view
			res.render('index', { imageToRender: randomPhoto });
			}
		});
	});
});

router.post('/electric', function(req, res, next){
	// res.json(req.body);
	// 1. we know whether they voted electric or poser because it's in req.body 
	// 2. we know what image they voted on because it's in req.body.image
	// 3. we know who they are because we have their IP address
	
if(req.body.submit == "Electric!"){
	var upDownVote = 1;
}else if(req.body.submit == "Poser"){
	upDownVote = - 1;
}

	db.collection('votes').insertOne({
		ip: req.ip,
		vote: req.body.submit,
		image: req.body.image
	});

	// 7. update the images collection so that an image voted on will have a new total votes
	db.collection('images').find({imgSrc: req.body.image}).toArray(function(error, result){
		var electrics;
		var posers;
		var total;
		var inputValue = req.body.submit;

		if(isNaN(result[0].totalVotes)){
			total = 0;
		}else{
			total = result[0].totalVotes;
		}
		if(isNaN(result[0].poserVotes)){
			posers = 0;
		}else{
			posers = result[0].poserVotes;
		}
		if(isNaN(result[0].electricVotes)){
			electrics = 0;
		}else{
			electrics = result[0].electricVotes;
		}
		db.collection('images').updateOne(
			{ imgSrc: req.body.image},
			{
				$set: {'totalVotes': (total + 1)}
				}, function(error, results){
				// check to see if there is an error
				// check to see if the document was updated
					if(error){
						console.log("error");
					}else{
						console.log('updating');
					}
				}
			)
		if(inputValue === "Electric!"){
			db.collection('images').update(
				{ imgSrc: req.body.image},
				{
					$set: {'electricVotes' : (electrics + 1), 'poserVotes':posers}
				}, function(error, results){
				// check to see if there is an error
				// check to see if the document was updated
				if(error){
						console.log("error");
					}else{
						console.log('electric');
					}
				}
			)
		}else if(inputValue === "Poser"){
			db.collection('images').update(
				{ imgSrc: req.body.image},
				{
					$set: {'poserVotes': (posers + 1), 'electricVotes' : electrics}
				}, function(error, results){
				// check to see if there is an error
				// check to see if the document was updated
				if(error){
						console.log("error");
					}else{
						console.log('poser');
					}
				}
			)
		}
	})
	// res.json('success!');
	res.redirect('/');

});

router.get('/standings', function(req, res, next){
	db.collection('images').find().toArray(function(error, allResults){
		// var standingsArray = [];
		allResults.sort(function(a,b){
			return (b.totalVotes - a.totalVotes);  
		});
		res.render('standings', {theStandings: allResults});
	});
});
	
router.get('/resetUserVotes', (req, res, next) =>{
	db.collection('votes').deleteMany(
		{ip: req.ip},
		function(error, results){

		}
	);
	res.redirect('/')
});

module.exports = router;
