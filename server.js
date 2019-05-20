const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise-native');
const $ = require('cheerio');
const uuid = require('uuid/v1');

const mail = require('./mail');


const app = express();
const port = 3005;
const minutes = 15
const timeout = minutes * 60000;
const url = ['http://www.heatopava.cz/rezervace/?page_id=2&room=1&week=1#kal','http://www.heatopava.cz/rezervace/?page_id=2&room=1&week=2#kal', 'http://www.heatopava.cz/rezervace/?page_id=2&room=1&week=3#kal', 'http://www.heatopava.cz/rezervace/?page_id=2&room=1&week=4#kal'];

// PARSE JSON TO ARRAY OF OBJECT WITH WATCHED HEAT LESSONS
const guard = () => JSON.parse(fs.readFileSync('guard.json'));


const writeToJSON = (jsonDataArg, newItemArg) => {
    fs.writeFileSync('guard.json', JSON.stringify([...jsonDataArg, newItemArg ],undefined, 4))
    return [...jsonDataArg, newItemArg ]
}

const deleteFromJSON = (jsonDataArg, id) => {
    fs.writeFileSync('guard.json', JSON.stringify(jsonDataArg.filter((element) => {
        return element.id !== id
    }), undefined, 4))
};

// writeToJSON(guard(), {novaPolozka: 'cus'})
deleteFromJSON(guard(), '1adf5ewf');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));




//go through array of heat time table pages and store value of div which contains number of free spaces into var freeSpots
//if HEAT class is not found then freeSpots will be NaN,
//if there are no free places (freeSpots === 0) then recursion via setTimeout is applied, if there is free space then mail is sent and function ends

let userNotified =false

    // RETURNS ARRAY OF PENDING PROMISES, WHICH CHECKS FREE PLACES ON 4 URLS OF URL VARIABLE
const crawlPages = (date, time) => {
   return url.map((singleUrl) => {
        return rp(singleUrl).then((html) => {
            let free = parseInt($(`td:contains(${date})`, html).siblings('td').children(`[href*='time=${time}']`).children('div.free').text(),10) //number of free spo
            console.log(free);
            return free;
        })
    })
   
}

// SEARCHES ARRAY OF RESULTS (IF NO HEAT IS FOUND THEN SOURCE ARRAY IS [NaN,NaN,NaN,NaN], IF IT IS FOUND ONE ELEMENT IS NUMBER), IF HEAT IS FOUND RETURN NUMBER OF FREE SPOTS, IF NOT FOUND RETURN -1
const deliverFreeSpots = (arrArg) => {
   const result =  arrArg.find((element) => {
        return !isNaN(element)
    });

    if (result === undefined) {
        return -1
    } else {
        return result
    };
};



const respondToNumOfSpots = (crawlResultArg, dateArg, timeArg, idArg) => {
    const freeSpots = deliverFreeSpots(crawlResultArg);
    console.log('probiha then od promise.all, freeSpots je: ', freeSpots)
    console.log('je id? ', idArg)

   

    if (freeSpots > 0) {
        console.log(`hura je volnych ${freeSpots} mist`)
        if(idArg) deleteFromJSON(guard(), idArg);
    } else if (freeSpots === 0) {
        console.log(`bohuzel je volnych ${freeSpots} mist`)
        setTimeout(() => {checkHeat(dateArg, timeArg, idArg)}, 10000)
    } else if (freeSpots < 0) {
        console.log('hodina heatu nenalezdena');
        if(idArg) deleteFromJSON(guard(), idArg);

        
    }
    return freeSpots
}

let numberOfSpots;

const checkHeat = (date, time, id, callback) => {
    
    // PROCESSES ALL PROMISES DETECTING NUMBER OF FREE SPOTS AND SUMS THEM TO SINGLE ARRAY and passes them to .then handler
    Promise.all(crawlPages(date, time))
    .then((crawlResult) => {respondToNumOfSpots(crawlResult, date, time, id)})
    .then((freePlaces) => {callback(freePlaces)})
    
};

const checkOnRequest = (date, time, email, callback) => {
    let resultUponPostRequest;
    const id = uuid()
    writeToJSON(guard(), {date, time, email, id})
    checkHeat(date, time, id, callback);
    return Promise.resolve('jede')

}

//on post request
// checkOnRequest('21.5', '1800', 'extender01@gmail.com');

// console.log(guard())

const checkOnRestart = () => {
    const loadedGuards = guard();
    loadedGuards.forEach((element) => {
        checkHeat(element.date, element.time, element.id)
        console.log(`guarding id ${element.id}`)
    })

}

// checkOnRestart()






// console.log(checkForSpots('21.5', '1700'));
//VYRESIT ZE USERNOTIFIED SE PREPISE NA TRUE PRI PRVNIM POST REQUESTU A PAK UZ ZUSTANE PORAD TRUE TAKZE U DALSICH REQUESTU SE NEPROVEDE CALLBACK RES.SEND !!!!!!!!!!!!!

// const promiseHtml = async () => {

// }

// async function f() {
//     return 'ahoj';
// }
// f().then((vysledek) => {console.log(vysledek)}); // 1

// const free = (dateArg, timeArg) => {
//     let pagesChecked = 0
//     let freeSpots
//     const reduced = url.reduce( async  (accumulator, currentWebPage) => {
//          await rp(currentWebPage).then((html) => {
//             console.log('provadim reduce', pagesChecked)
//             freeSpots = parseInt($(`td:contains(${dateArg})`, html).siblings('td').children(`[href*='time=${timeArg}']`).children('div.free').text(),10) //get number of free spots
//             if(pagesChecked > 2) {
//                 accumulator = -1
//                 return accumulator
//             }
//             if(!isNaN(freeSpots)) {

//             }

            
            
//             if(isNaN(freeSpots)) {
//                 ++pagesChecked
//             } 
//         })
//         // return 'baf'

//     },[])
//     console.log(reduced)
// };

// // console.log(free('20.5', '1800'));
// free('20.5', '1800')

//////////////////////////////////////////////////////

// function test(url) {
//     return rp(url)
// }

// let final = []

// function delej(arr) {
//     return arr.reduce((promise, item) => {
//         return promise.then((result) => {
//             console.log(`probiha promisa ${item}`);
//             return test(item).then((result2) => {
//                 console.log('probiha push', item)
//                 final.push(result2)
//             })
//         })
//     }, Promise.resolve())
// }

// delej(url).then(() => {console.log('tohle je vysledek')})

    ///////////////////////////////////////////////////////////////
// function dupej(arr) {
//     return arr.reduce((promise, item) => {
//         return promise.then((res) => {

//         })
//     })
// }
 

const checkHeatPages = (adresa, datum, cas, callback) => {
    let pagesChecked = 0;
    let saveRecord
    url.forEach((website) => {
        rp(website).then((html) => {
            let freeSpots = parseInt($(`td:contains(${datum})`, html).siblings('td').children(`[href*='time=${cas}']`).children('div.free').text(),10) //get number of free spots
            console.log('freespots', freeSpots)
            if(!isNaN(freeSpots)) {     //freeSpots is number, HEAT class found
                if(freeSpots === 0) {   //freeSpots is 0 -> no free spot, aplly recursion by setTimeout
                    if(!userNotified) {
                        callback(`bohuzel, v terminu ${datum} ${cas} neni volne misto, budu ti to hlidat a kdyztak poslu mail na adresu ${adresa} `);
                        fs.writeFileSync('guard.json', JSON.stringify(uuid()))
                        console.log(guard)
                        userNotified = true
                    }
                    setTimeout(() => {
                        checkHeatPages(adresa, datum, cas, callback)
                    }, timeout) 
                   
                    let currentTime = new Date().toLocaleTimeString();
                    console.log(`${currentTime} bohuzel, v terminu ${datum} ${cas} neni volne misto: `, freeSpots)
                } else {      //freeSpots is number but not 0 -> free spot found!
                   
                    let currentTime = new Date().toLocaleTimeString();

                    console.log(`${currentTime} hura, naslo se ${freeSpots} v terminu ${datum} ${cas} `)

                    if(!userNotified){
                        callback(`hodina HEATu v terminu ${datum} ${cas} MA ${freeSpots} VOLNE MISTA, zkontroluj to na heatopava.cz`)
                        userNotified = true
                    }

                    state = 'uspech';
                    mail.sendEmail(adresa, datum, cas)

                    return state;
                   
                   
                }
    
    
            } else {    //freeSpots is NaN -> HEAT class not found on webpage, if that happens 4 times
                pagesChecked++;

                // console.log('hodina heatu nenalezena, pocitadlo je: ', pagesChecked);
                
                if(pagesChecked === 4) {
                    let currentTime = new Date().toLocaleTimeString();
                    console.log(currentTime);
                    console.log('zkontrolovany vsechny 4 strany, hodina heatu nenalezena' )
                    callback(`hodina HEATu v terminu ${datum} ${cas} nenalezena, zkontroluj termin na heatopava.cz`)

                    pagesChecked = 0;

                }
    
            }
        })
        
        .catch((err) => {
            console.log(err);

            
        });
    });

    

};


// guard.forEach((element) => {
//     checkHeatPages(element.email, element.date, element.time, (message) => {console.log('z JSONu: ', message)})
// })







app.get('/', function (req, res) {
    res.render('index');
});


app.post('/send', (req,res) => {
    console.log('muzeme zacinati zaklinati');
    // checkHeatPages(req.body.email, req.body.date, req.body.time, (message) => {
    //     // console.log('callback po probehnuti then')
    //     res.send(message);
    // });
    checkOnRequest(req.body.date, req.body.time, req.body.email, (number) => {res.send(`volnych mist je ${number}`)})


});







app.listen(port, function(req, res){
    console.log('Server is running at port: ',port);
});








