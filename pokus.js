console.log(Promise.resolve('ahoj'))
const premisa = new Promise((resolve, reject) => {});

const cus = Promise.resolve(premisa);
console.log(cus);