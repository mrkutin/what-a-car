import Redis from 'ioredis'
const sub = new Redis()
const pub = new Redis()

try {
    await sub.xgroup('CREATE', 'plates_requested_stream', 'sravni', '$', 'MKSTREAM')
} catch (e){
    console.log('Group "sravni" already exists, skipping')
}

// Usage 1: As message hub
async function listenForMessageOne(lastId = '$') {
    const results = await sub.xreadgroup('GROUP', 'sravni', 'sravni_instance_1','BLOCK','0','COUNT', '10', 'STREAMS', 'plates_requested_stream', '>')
    const [key, messages] = results[0]; // `key` equals to "plates_requested_stream"
    messages.forEach((message) => {
        console.log(`Listener ONE - Id: ${message[0]}. Data: ${message[1]}`)
    })
    await listenForMessageOne(messages[messages.length - 1][0])
}

listenForMessageOne()

async function listenForMessageTwo(lastId = '$') {
    const results = await sub.xreadgroup('GROUP', 'sravni', 'sravni_instance_1','BLOCK','0','COUNT', '10', 'STREAMS', 'plates_requested_stream', '>')
    const [key, messages] = results[0]; // `key` equals to "user-stream"
    messages.forEach((message) => {
        console.log(`Listener TWO - Id: ${message[0]}. Data: ${message[1]}`)
    })
    await listenForMessageTwo(messages[messages.length - 1][0])
}

listenForMessageTwo()

// setInterval(async () => {
//     // `redis` is in the block mode due to `redis.xread('BLOCK', ....)`,
//     // so we use another connection to publish messages.
//     const res = await pub.xadd('plates_requested_stream', "*", "name", "John", "age",  Math.random())
// }, 0)

