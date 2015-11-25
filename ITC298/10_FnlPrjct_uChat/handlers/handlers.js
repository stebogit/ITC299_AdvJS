/**
 * Created by Stefano on 11/13/15.
 */

var db = require("../db");
var async = require('async');

module.exports = {

    checkSession: function (req, reply) {
        var page = req.params.page;
        var identity = req.state.identity;

        switch (page) {

            case "login":
                if (identity == 'authenticated') {
                    reply.redirect("/uChat");
                } else {
                    reply.view("login", {
                        pageTitle: "uChat log-in",
                        notification: ''
                    });
                }
                break;

            case "signin":
                reply.view("signin", {
                    pageTitle: "uChat sign-in",
                    notification: ''
                });
                break;

            case "logout":
                var username = req.state.username;
                db.deleteSession(username, function () {
                    reply.unstate("username");
                    reply.unstate("sessionID");
                    reply.unstate("identity");
                    reply.view("login", {
                        pageTitle: "log-out",
                        notification: 'You successfully <strong>logged out</strong>'
                    });
                });
                break;

            case "uChat":
                if (identity == 'authenticated') {
                    var userName = req.state.username;
                    var sessionID = req.state.sessionID;

                    reply.view("chat", {
                        pageTitle: "uChat",
                        username: userName,
                        sessionID: sessionID
                    });
                } else {
                    reply.redirect("/login");
                }
                break;

            default:
                reply.redirect("/login");
                break;

        }
    },

    signin: function (req, reply) {
        //pwd & email & username are required in the form, no need to check if not null
        var newUserName = req.payload.username;
        var pwd = req.payload.pwd;
        var email = req.payload.email;

        //verify if user already exists
        db.getUser(newUserName, function (err, dataFromDB) {
            if (err) { console.error(err); }
            if (!dataFromDB) {
                //create sessionID
                var sessionID = String(Date.now());
                async.waterfall([
                        function (done) {
                            db.insertUser({
                                $username: newUserName,
                                $pwd: pwd,
                                $email: email
                            }, function (err) {
                                if (err) { console.error(err); }
                                //console.log("new user inserted");
                                done();
                            });
                        },
                        function (done) {
                            db.insertSession({
                                $username: newUserName,
                                $sessionID: sessionID
                            }, function (err) {
                                if (err) { console.error(err); }
                                //console.log("session inserted");
                                done();
                            });
                        }],
                    function (err) {
                        if (err) { console.error(err); }
                        //set cookies
                        reply.state("username", newUserName);
                        reply.state("sessionID", sessionID);
                        reply.state("identity", 'authenticated');
                        reply.redirect("/uChat");
                });
            } else {
                //if user already in DB notify
                reply.view("signin", {
                    pageTitle: "uChat sign-in",
                    notification: 'User <strong>already exists</strong>, just log-in!'
                });
            }
        });
    },

    login: function (req, reply) {
        //pwd & username are required in the form, no need to check if not null
        var username = req.payload.username;
        var pwd = req.payload.pwd;
        //console.log('login username:', username);

        //if authenticated redirect
        var identity = req.state.identity;
        if (identity == 'authenticated') {
            reply.redirect("/uChat");
        } else {
            db.getUser(username, function (err, dataFromDB) {
                if (err) { console.error(err); }
                //console.log('username:', username);
                //console.log('pwd:', dataFromDB);
                if (!dataFromDB) {
                    //reply.redirect("/signin");
                    reply.view("login", {
                        pageTitle: "uChat log-in",
                        notification: 'User not registered, please <strong>Sign-in</strong>'
                    });
                } else {
                    if (pwd == dataFromDB.pwd) {
                        //create sessionID
                        var sessionID = String(Date.now());
                        //clear previous session data (the whole row where the data is stored)
                        db.deleteSession(username, function (err) {
                            if (err) { console.error(err); }
                            //save the new session ID
                            db.insertSession({
                                $username: username,
                                $sessionID: sessionID
                            }, function (err) {
                                if (err) { console.error(err); }
                                //set/update cookies
                                reply.state("username", username);
                                reply.state("sessionID", sessionID);
                                reply.state("identity", 'authenticated');
                                reply.redirect("/uChat");
                            });
                        })
                    } else {
                        //reply.redirect("/login");
                        reply.view("login", {
                            pageTitle: "uChat log-in",
                            notification: 'Username or Password <strong>not correct</strong>'
                        });
                    }
                }
            });
        }
    }

};


