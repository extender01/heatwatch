const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise-native');
const $ = require('cheerio');
const uuid = require('uuid/v1');

const mail = require('./mail');


const app = express();
const port = 3005;
const minutes = 15;
const timeout = minutes * 60000;
const url = ['http://www.heatopava.cz/rezervace/?page_id=2&room=1&week=1#kal','http://www.heatopava.cz/rezervace/?page_id=2&room=1&week=2#kal', 'http://www.heatopava.cz/rezervace/?page_id=2&room=1&week=3#kal', 'http://www.heatopava.cz/rezervace/?page_id=2&room=1&week=4#kal'];




// PARSE JSON TO ARRAY OF OBJECT WITH WATCHED HEAT LESSONS
const guard = () => JSON.parse(fs.readFileSync('guard.json'));

let state = guard();
console.log('state na zacatku', state)




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

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));


// mail.sendEmail('extender01@gmail.com', 'nikdy', 'vzdycky')

//go through array of heat time table pages and store value of div which contains number of free spaces into var freeSpots
//if HEAT class is not found then freeSpots will be NaN,
//if there are no free places (freeSpots === 0) then recursion via setTimeout is applied, if there is free space then mail is sent and function ends



    // RETURNS ARRAY OF PENDING PROMISES, WHICH CHECKS FREE PLACES ON 4 URLS OF URL VARIABLE, .then will have array of 4 values (NaN or number)
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
const getNumberOfFreeSpots = (arrArg) => {
   const result =  arrArg.find((element) => {
        return !isNaN(element)
    });

    if (result === undefined) {
        return -1
    } else {
        return result
    };
};

const parseFormInput = (inputObject) => {
    let outputObject = {};
    outputObject.date = inputObject.date.slice(0, -1);
    outputObject.time = inputObject.time.slice(0, 2) + inputObject.time.slice(3);
    outputObject.email = inputObject.email;

    console.log(outputObject);
    return outputObject
};


const isInState = (id) => {
    return state.some((element) => {
        return element.id === id
    });
};



const httpResponseString = (freeSpotsArg, dateArg, timeArg, emailArg) => {
    if (freeSpotsArg === 0) {
        return `Bohužel v žádaném termínu ${dateArg} ${timeArg} není volné místo. Budu to hlídat a pokud se uvolní, napíšu ti na ${emailArg}`
    } else if (freeSpotsArg > 0) {
        return `V termínu ${dateArg} ${timeArg} je volné místo (${freeSpotsArg})`
    } else if (freeSpotsArg < 0) {
        return `V termínu ${dateArg} ${timeArg} nebyla hodina HEATu nalezena.)`
    } else {
        return `neco je spatne`
    }
};




const checkHeat = (data, id) => {
    const {date, time, email} = data //desctructuring
    
    // PROCESSES ALL PROMISES DETECTING NUMBER OF FREE SPOTS AND SUMS THEM TO SINGLE ARRAY and passes them to .then handler
    // crawlResult je napr [NaN,NaN, cislo, NaN]
    return Promise.all(crawlPages(date, time))
    .then ((crawlResult) => {
        const freeSpots = getNumberOfFreeSpots(crawlResult);
        const currentTime = new Date()
        const noveId = uuid();

        console.log(currentTime)
        
       
        if (freeSpots === 0) {
            console.log(`bohuzel je volnych ${freeSpots} mist`)

            // NO ID INCOMING MEANS RUNNING AFTER POST REQUEST FOR 1ST TIME, GENERATE AND SAVE NEW ID AND USE IT ON NEXT RECURSION (WON'T RUN AGAIN)
            if(!id) {
                console.log('id neprislo')
                writeToJSON(guard(), {date, time, email, id: noveId, stop: false});
                state.push({date, time, email, id: noveId, stop: false});
                mail.sendWatching(email, date, time, noveId);
                console.log('state: ', state)
                setTimeout(() => {checkHeat(data, noveId)}, 600000)
            } else {
                console.log('id prislo', id)
                console.log('isInState', isInState(id));
                if (isInState(id)) {
                    setTimeout(() => {checkHeat(data, id)}, 600000);
                }

            }
        } else if (freeSpots > 0) {


            console.log(`hura je volnych ${freeSpots} mist, POSLEM ZPRAVU NA ${email}`)
            // ID EXISTS MEANS ITS NOT RUNNING FOR 1ST TIME SO DELETE FROM JSON AND SEND MESSAGE (FOR FIRST TIME NO NEED TO SEND MESSAGE)
            if(id) {
                deleteFromJSON(guard(), id);
                removeFromState(id)
                mail.sendFoundSpot(email, date, time)
            } 

        } else if (freeSpots < 0) {
            
            console.log('hodina heatu nenalezdena');
            if(id) {
                deleteFromJSON(guard(), id);
                removeFromState(id);
            } 

        } else {

            console.log( 'Něco se pokazilo při zjišťování počtu volných míst')
            throw 'Něco se pokazilo při zjišťování počtu volných míst'
        }

        

        // RETURNING FREE SPOTS FOR THEN HANDLER IN HTTP RESPONSE OF EXPRESS ROUTE
        return freeSpots
    })


       

};

const checkOnRequest = (data) => {
   
    
    
    return checkHeat(parseFormInput(data), undefined) //undefined beacuse no id for 1st time
    .then((freeSpots) => {
        
        const responseMessage = httpResponseString(freeSpots, data.date, data.time, data.email)
        console.log('bezi to furt?')
        return responseMessage
    });
    

};

const checkOnRestart = () => {
    const loadedGuards = guard();
    state = loadedGuards;
    loadedGuards.forEach((element) => {
        checkHeat(element, element.id)
        console.log(`guarding id ${element.id}`)
    })

}


checkOnRestart()








const removeFromState = (id) => {
    state = state.filter((element) => {
        return element.id !== id
    });
};



app.get('/', function (req, res) {
    res.render('index');
});


app.post('/send', (req,res) => {
    console.log('muzeme zacinati zaklinati');
    checkOnRequest({date: req.body.date, time: req.body.time, email: req.body.email})
    .then((message) => {
        res.send(message)
    })
    .catch((err) => {
        res.send(err)
    })
});

app.get('/rusim/:id', (req, res) => {
    removeFromState(req.params.id)
    deleteFromJSON(guard(), req.params.id);

    res.send(req.params.id)
})







app.listen(port, function(req, res){
    console.log('Server is running at port: ',port);
});








