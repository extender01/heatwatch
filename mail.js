const nodeMailer = require('nodemailer');
const credentials = require('./credentials');


const transporter = nodeMailer.createTransport({
    host: 'smtp-173765.m65.wedos.net',
    port: 465,
    secure: true,
    auth: {
        user: credentials.user,
        pass: credentials.password
    }
});


const emailFoundFreeSpot = (email, date, time) => {
    return {
        from: '"Hlidac HEATu" <exty@exty.cz>', // sender address
        to: email, // list of receivers
        subject: 'hlidac heatu', // Subject line
        text: `Uvolnilo se misto na heatu! ${date} ${time} http://www.heatopava.cz/rezervacni-system.html`, // plain text body

    }
};

const emailGuardStart= (email, date, time, id) => {
    return {
        from: '"Hlidac HEATu" <exty@exty.cz>', // sender address
        to: email, // list of receivers
        subject: 'hlidam', // Subject line
        text: `Hlidam volne misto na hodine HEATu ${date} ${time}. http://www.heatopava.cz/rezervacni-system.html`, // plain text body
        html: '<p>Hlidam volne misto misto na hodine HEATu ' + date + ' ' + time + '. Pokud se uvolni misto, napisu ti na' + email + '</p><p>Zrusit hlidani muzes <a href="heat.exty.cz/rusim/' + id + '">zde</a></p>'

    }
};


const emailHeatClassNotFound = (date, time) => {
    return {
        from: '"Vita Hlidac" <exty@exty.cz>', // sender address
        to: 'extender01@gmail.com', // list of receivers
        subject: 'hodina heatu nenalezena', // Subject line
        text: `Hodina heatu nenalezena` // plain text body

    }
};





exports.sendFoundSpot = (email, date, time) => {
    transporter.sendMail(emailFoundFreeSpot(email, date, time), (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message found free spot %s sent: %s', info.messageId, info.response);
        })
};

exports.sendWatching = (email, date, time, id) => {
    transporter.sendMail(emailGuardStart(email, date, time, id), (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message started watching %s sent: %s', info.messageId, info.response);
        })
};



