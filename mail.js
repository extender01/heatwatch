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


const emailFoundFreeSpot = (adresa, datum, cas) => {
    return {
        from: '"Hlidac HEATu" <exty@exty.cz>', // sender address
        to: adresa, // list of receivers
        subject: 'hlidac heatu', // Subject line
        text: `Uvolnilo se misto na heatu! ${datum} ${cas}` // plain text body

    }
};


const emailHeatClassNotFound = (datum, cas) => {
    return {
        from: '"Vita Hlidac" <exty@exty.cz>', // sender address
        to: 'extender01@gmail.com', // list of receivers
        subject: 'hodina heatu nenalezena', // Subject line
        text: `Hodina heatu nenalezena` // plain text body

    }
};





exports.sendEmail = (adresa, datum, cas) => {
    transporter.sendMail(emailFoundFreeSpot(adresa, datum, cas), (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
        })
};



