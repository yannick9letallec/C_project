// imports
let util = require( "util" )
let f = require( "fs" )
let path = require( "path" )
let http = require( "http" )
let crypto = require( "crypto" )
let cookies = require( "cookie-parser" )
let body_parser = require( "body-parser" )
let sanitize = require( "sanitize-html" )

let express = require( "express" )

let multer = require( "multer" )
let upload = multer( { dest : "./upload/" } )

let mongo_c = require( "mongodb" ).MongoClient
let ObjectID = require( "mongodb" ).ObjectID

var urlencodedParser = body_parser.text( { type: "text/plain" } )

///////////////////////////////////////////////////////////////////////////////////////
// Vars
let css_path = "./front/css/"
let img_path = "./img/"


///////////////////////////////////////////////////////////////////////////////////////
// Express App
let app = express()
app.use( cookies() )

app.set( "view engine", "pug" )
app.set( "views", [ "front/templates", "front/templates/forms", "front/templates/blocks", "front/templates/validations" , "front/templates/listes", "front/templates/emails" ] )

// Routers - @todo : utiliser ?
/*
let router_salle = express.Router( )
let router_conference = express.Router( )
let router_utilisateur = express.Router( )
let router_conferencier = express.Router( )
*/

///////////////////////////////////////////////////////////////////////////////////////
// PUBLIC PART
app.get( "/", ( req, res ) => {
console.log( "[ OK ] : On LP"  ) 
console.dir( req.cookies.rememberMe )

res.render( "index", { "title": "Toutes les conférences de France" } )
// res.send( "BIM" )
})

///////////////////////////////////////////////////////////////////////////////////////
// ADMIN PART

app.get( "/admin/log", ( req, res ) => {
res.render( "login", { "title": "Confrance: Authentification" } )
})

app.get( "/admin", ( req, res ) => {
res.render( "admin", { "title": "Confrance: Authentification" } )
})

app.post( "/admin/log", upload.single(), ( req, res, next ) => {

let login = req.body.login
let pwd = req.body.pwd
let rememberMe = req.body.rememberMe

console.log( "[ OK ] : >>> " + rememberMe ) 

// @todo: log with real user credential
mongo_c.connect( "mongodb://C_project:C_project@127.0.0.1:27017/C_project", ( error, db ) => {
	if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

	let dbo = db.db( "C_project" )
	dbo.collection( "user" ).find( { login, pwd } ).toArray( ( error, results ) => {
		if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

		// @todo : handle passwords
		if( results.length === 0 || !results[ 0 ].validated ){
			res.send( "Connexion refusée" )
		} else if( results.length > 1 ) {
			// @todo : app needs maintenance ...
			console.log( "APP needs maintenance: /admin/log ..." )
		} else {
			if( rememberMe === "on" ){
				// set cookie lifetime to +30 D
				res.cookie( "rememberMe", "1", { expires: new Date( Date.now() + 2592000 ) })
				console.log( "[ KO ] : COOKIE SEND" ) 
			} else {
				console.log( "[ OK ] : COOKIE" ) 
			}
			res.cookie( "login", login, { expires: new Date( Date.now() + 2592000 ) })
			res.render( "admin", { "title": "Confrance: Bienvenue sur votre administration" } )
		}
	} )

	console.log( "[ OK ] : ------- POST CX" ) 

} )

})

app.post( "/admin/checkLogin", upload.single(), ( req, res, next ) => {
let login = req.body.login

// @todo: log with real user credential
mongo_c.connect( "mongodb://C_project:C_project@127.0.0.1:27017/C_project", ( error, db ) => {
	if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

	let dbo = db.db( "C_project" )
	dbo.collection( "user" ).find( { login: login } ).toArray( ( error, results ) => {
		if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )
			if( results.length !== 0 ){
				res.send( "Login déjà utilisé. Veuillez en utiliser un autre" )
			} else {
				res.send( "Ce login est disponible !" )
			}
	} )
} )

})

// UTILISATEURS
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.route( "/admin/Utilisateur" )
	.post( upload.single(), ( req, res, next ) => {

		let login = req.body.login
		let pwd = req.body.pwd
		let email = req.body.email
		
		// @todo: log with real user credential
		mongo_c.connect( "mongodb://C_project:C_project@127.0.0.1:27017/C_project", ( error, db ) => {
			if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

			let dbo = db.db( "C_project" )
			dbo.collection( "user" ).find( { login: login } ).toArray( ( error, results ) => {
				if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )
					console.log( "[ OK ] : ------- CREATION " + login, pwd, email ) 
				if( results.length === 0 ){
					// generate hash validation
					let sec = login + email
					hash = crypto.createHmac( "sha256", sec )
						.update( "some alt" )
						.digest( 'hex' )

					dbo.collection( "user" ).insert( { login, pwd, email, validated: false, hash } ).then( ( result ) => {
						// Send Email for Account Validation
						sendValidationEmail( login, email, hash )
						res.send( "Pour valider votre compte, vérifiez vos emails " + result )
					}, ( error ) => {
						res.send( "Création du compte impossible, merci d'essayet à nouveau " + error )
					} )

				} else {
					res.send( "Login déjà utilisé. Veuillez en utiliser un autre" )
				}
			} )
			console.log( "[ OK ] : ------- POST CX" ) 
		} )
	})
	.get( ( req, res ) => {
			console.log( "[ OK ] :COMPTE " ) 
		mongo_c.connect( "mongodb://C_project:C_project@127.0.0.1:27017/C_project", ( error, db ) => {
			if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

			let login = req.cookies.login
			let dbo = db.db( "C_project" )

			dbo.collection( "user" ).find( { login } ).toArray( ( error, user ) => {
				if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )
					let r = user.length
					if( r === 0 ){
						// @todo : maintenance PB !!
					} else if( r === 1 ) {
						dbo.collection( "roles" ).find().toArray( ( error, roles ) => {
							if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )
							
							res.render( "formUtilisateur", { action: "actuCompteUtilisateur", data: user[ 0 ], roles: roles[0].roles } )
						})
					} else {
						// @todo : send email to administrator
					}
			} )
		} )
	})
	.put( upload.single(), ( req, res ) => {
		console.dir( req.body ) 

		mongo_c.connect( "mongodb://C_project:C_project@127.0.0.1:27017/C_project", ( error, db ) => {
			if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

			let login = req.cookies.login
			let dbo = db.db( "C_project" )

			dbo.collection( "user" ).find( { login } ).toArray( ( error, results ) => {
				if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )
					let r = results.length
					if( r === 0 ){
						// @todo : maintenance PB !!
					} else if( r === 1 ) {
						console.dir( results[ 0 ] ) 
						// update data in mongo
						res.send( "OK COMPTE ACTUALISE" )
						// res.render( "createAccount", { action: "actuCompteUtilisateur", data: results[ 0 ] } )
					} else {
						// @todo : send email to administrator
					}
			} )
		} )
	})


// CONFERENCIERS
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.route( "/admin/conferenciers" )
	.get( ( req, res ) => {
		console.log( "[ OK ] : CCCCC" ) 
		mongo_c.connect( "mongodb://C_project:C_project@127.0.0.1:27017/C_project", ( error, db ) => {
			if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

			let dbo = db.db( "C_project" )

			dbo.collection( "conferenciers" ).find( ).toArray( ( error, results ) => {
				if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )
				
				let data = {
					title: "VOS CONFERENCIERS", 
					domaine: "conferencier",
					res: results
				}

				if( results.length === 0 ) data.vide = "Aucun conférencier ajouté pour le moment"  
				
				res.render( "vueConferenciers", data )
			} )
		} )
	})
app.route( "/admin/conferencier" )
	.get( upload.single(), ( req, res ) => {
		res.render( "formConferencier", { data: {}, title: "AJOUTER UN CONFERENCIER", action: "ajouter" } )
	})

// SALLES
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.route( "/admin/salles" )
	.get( ( req, res ) => {
		mongo_c.connect( "mongodb://C_project:C_project@127.0.0.1:27017/C_project", ( error, db ) => {
			if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

			let dbo = db.db( "C_project" )

			dbo.collection( "salles" ).find( ).toArray( ( error, results ) => {
				if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )
				
				let data = {
					title: "VOS SALLES", 
					domaine: "salle",
					res: results
				}

				if( results.length === 0 ) data.vide = "Aucune salle crée pour le moment"  
				
				res.render( "vueSalles", data )
			} )
		} )
	})
app.route( "/admin/salle" )
	.get( upload.single(), ( req, res ) => {
		res.render( "formSalle", { data: {}, title: "AJOUTER UNE SALLE", action: "ajouter" } )
	})
	.delete( urlencodedParser, ( req, res ) => {
		mongo_c.connect( "mongodb://C_project:C_project@127.0.0.1:27017/C_project", ( error, db ) => {
			if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

			let id = req.body
			let dbo = db.db( "C_project" )

			dbo.collection( "salles" ).updateOne( { _id: ObjectID( id ) }, { $set: { "status": "demande_suppression" } }, ( error, results ) => {
				if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

				res.send( "Votre demande de suppression est prise en compte. La salle sera supprimée après vérification" )
			} )
		} )
	})
	.post( upload.array( "imageSalle" ), ( req, res ) => {
		let e = 0,
			erreur_fichier = "Le(s) fichier() envoyé(s) ne correspond(ent) pas à une image : ",
			erreur_champ = "Certains champs comportent des erreurs : "

		// validation cote serveur des données
		for( let prop in req.body ){
			if( prop === "nom" && ( req.body[ prop ] === "" || req.body[ prop ].length > 255 )){
				erreur_champ += prop + " : est requis, moins de 255 caractères"
			}	
			if( prop === "nb_place" && ( req.body[ prop ] === "" || /\d*/.test( req.body[ prop ] ) ) ){
				erreur_champ += prop + " : est une valeur numérique"
			}	
			if( prop === "description" && ( req.body[ prop ] === "" || req.body[ prop ].length > 9999 ) ){
				erreur_champ += prop + " : est requis, maximum 9999 caractères"
			}	
			req.body[ prop ] = sanitize( req.body[ prop], { allowedTags: [ "s", "i", "em", "b", "u", "script" ] } )
		}

		req.body[ "createur" ] = req.cookies.login
		req.body[ "status" ] = "demande_creation"
		req.body[ "cfm_existance" ] = "false"
		
		// si erreur, envoi et arret du traitement
		if( e > 0 ) {
			res.send( "NOM TOO BIG" )
			return false
		}

		// traitement specific si images
		if( req.files ){
			l = req.files.length
			req.body.images = []
			for( var i = 0; i < l; i++ ){
				if( /image\/*/.test( req.files[ i ].mimetype )){
					f.renameSync( "./upload/" + req.files[ i ].filename, "./upload/salles/" + req.files[ i ].originalname )
					req.body.images.push( req.files[ i ].originalname )
				} else {
					e = 1
					erreur_fichier += " / " + req.files[ i ].originalname
				}
			}
		} 

		// si aucune erreur detectée, insertion en base de donnée
		if( e === 0 ){
			mongo_c.connect( "mongodb://C_project:C_project@127.0.0.1:27017/C_project", ( error, db ) => {
				if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

				let dbo = db.db( "C_project" )

				dbo.collection( "salles" ).insertOne( req.body, ( error, results ) => {
					if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )
						res.send( "La salle à bien été ajoutée !" )
				} )  
			} )
		} else {
			res.send( error )
		}
	})
	.put( urlencodedParser, ( req, res ) => {
		mongo_c.connect( "mongodb://C_project:C_project@127.0.0.1:27017/C_project", ( error, db ) => {
			if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

			let id = req.body
			let dbo = db.db( "C_project" )

			dbo.collection( "salles" ).find( { _id: ObjectID( id ) } ).toArray( ( error, results ) => {
				if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

				res.render( "formSalle", { title: "MODIFIER UNE SALLE", data: results[ 0 ], action: "modifier" } )
			} )
		} )
	})
	.patch( (req, res ) => {
		console.log( "[ OK ] : PATCH SALLE" ) 
	} )


// CONFERENCES
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/*
app.get( "/admin/vueAjoutConference", ( req, res ) => {
	res.render( "formConference", {} )
	mongo_c.connect( "mongodb://C_project:C_project@127.0.0.1:27017/C_project", ( error, db ) => {
		if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

		let hash = req.params.hash
		let dbo = db.db( "C_project" )

		dbo.collection( "user" ).find( { hash } ).toArray( ( error, results ) => {
			if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )
				let r = results.length
				if( r === 0 ){
					res.send( "Le  délai de validation de votre compte est dépassé" )
				} else if( r === 1 ) {
					if( results[ 0 ].validated ){
						res.send( "Ce compte à déjà été validé" )	
					} else {
						dbo.collection( "user" ).update( 
							{ hash }, 
							{ $set: { validated: true } }
						)
						res.render( "validateAccount", { login: results[ 0 ].login } )	
					}
				} else {
					// @todo : send email to administrator
			}
	} )
} )
})
*/
app.route( "/admin/conferences" )
	.get( ( req, res ) => {
		mongo_c.connect( "mongodb://C_project:C_project@127.0.0.1:27017/C_project", ( error, db ) => {
			if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

			let dbo = db.db( "C_project" )

			dbo.collection( "conferences" ).find( ).toArray( ( error, results ) => {
				if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

				let data = {
					title: "VOS CONFERENCES",
					domaine: "conference",	
					res: results
				}
					
				if( results.length === 0 ) data.vide = "Aucune conférence crée pour le moment" 

				res.render( "vueConferences", data )
			} )
		} )
	})
app.route( "/admin/conference" )
.get( ( req, res ) => {
	res.render( "formConference", { title: "AJOUTER UNE CONFERENCE", data: {} } ) 
})
.post( ( req, res ) => {
	console.log( "POST CONF" ) 
})
.put( ( req, res ) => {
	console.log( "PUT CONF" ) 
})
.delete( ( req, res ) => {
	console.log( "DELETE CONF" ) 
})


// GEO LOC
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post( "/admin/codePostalVersAdresses", upload.single(), ( req, res ) => {
	mongo_c.connect( "mongodb://C_project:C_project@127.0.0.1:27017/C_project", ( error, db ) => {
		if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

		let cp = req.body.cp
		let dbo = db.db( "C_project" )

		var _regex = new RegExp( "^" + cp + ".*" )
		console.log( "REGEXP : " + _regex ) 

		dbo.collection( "code_postaux" ).find( { code_postal: { $regex: _regex } } ).limit( 6 ).toArray( ( error, results ) => {
			if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

				let r = results.length
				if( r === 0 ){
					res.send( { msg: "Merci de renseigner un code postal valide" } )
				} else {
					console.dir( results ) 	
					res.send( results )	
				} 
		} )
	} )
})


app.get( "/admin/accountValidation/:hash", ( req, res ) => {

	mongo_c.connect( "mongodb://C_project:C_project@127.0.0.1:27017/C_project", ( error, db ) => {
		if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )

		let hash = req.params.hash
		let dbo = db.db( "C_project" )

		dbo.collection( "user" ).find( { hash } ).toArray( ( error, results ) => {
			if( error ) console.log( "[ KO ] : " + util.inspect( error, { depth: null, showHidden: true } ) )
				let r = results.length
				if( r === 0 ){
					res.send( "Le  délai de validation de votre compte est dépassé" )
				} else if( r === 1 ) {
					if( results[ 0 ].validated ){
						res.send( "Ce compte à déjà été validé" )	
					} else {
						dbo.collection( "user" ).update( 
							{ hash }, 
							{ $set: { validated: true } }
						)
						res.render( "validateAccount", { login: results[ 0 ].login } )	
					}
				} else {
					// @todo : send email to administrator
				}
		} )
	} )

})

// @debug
// sendValidationEmail( "BOB", "yannick9letallec@gmail.com" )
function sendValidationEmail( login, email, hash ){

	let sec = login + email
	hash = crypto.createHmac( "sha256", sec )
		.update( "some alt" )
		.digest( 'hex' )

	console.log( login, email, hash )

	let mail = require( "nodemailer" )
	let pug = require( "pug" )
	
	let compiledMail = pug.compileFile( "front/templates/includes/emails/accountValidation.pug" )

	let transporter = mail.createTransport( {
		service: "Gmail",
		auth: {
			user: "confrance.services@gmail.com",
			pass: "Kixsell_1"
		}
	} )

	let html = compiledMail( { login, hash } )
	console.log( html ) 
	let mailOptions = {
		from: "Yannick : confrance.services@gmail.com",
		to: email,
		subject: "[ CONFRANCE ] : Validez votre compte !",
		html: html
	}

	transporter.sendMail( mailOptions, ( error, info ) => {
		if( error ) console.log( "[ KO ] : " + error )

		console.log( "[ OK ] : " + info ) 
	} )
}

app.get( "/admin/createAccount", ( req, res ) => {
	res.render( "createAccount", { data: {}, action: "creerCompteUtilisateur", "title": "Confrance: Créez votre compte utilisateur" } )

})

app.get( "/*.css*", function ( req, res ) {
	f.readFile( css_path + path.basename ( req.path ), ( err, data ) => {
		if ( err ) {
			console.log( "ERROR : GETTING CSS " + req.path + " - " + path.basename() )
			console.dir( err ) 
		}
		
		console.log( "GETTING CSS" )
		res.type( "text/css" )
		res.send( data )
	})
})

app.get( "*.(ico|png|jpeg|jpg)", function ( req, res ) {
	console.log( "GETTING IMAGE " + req.path )
	f.readFile( img_path + path.basename( req.path ), ( err, data ) => {
		if ( err ) console.log( "ERROR : GETTING IMAGE" + util.inspect( err, { showHidden: true, depth: null } ))

		console.log( "IMG IN ------------------" + req.path ) 
		var ext = path.extname( req.path ).substr( 1 )
		if(  ext === "ico" ) {
			var subtype = "x-icon"
		} else {
			var subtype = ext
		}
		res.type( "image/" + subtype )
		res.send( data )
	})
})

app.listen( 3000, () => {
	console.log( "[ OK ] : " ) 
})
