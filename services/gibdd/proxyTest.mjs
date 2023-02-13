import axios from 'axios'
import {SocksProxyAgent} from 'socks-proxy-agent'

// const proxyOptions = `socks5://190.2.155.30:21551`
const proxyOptions = `socks5://185.132.177.55:32859`
const httpsAgent = new SocksProxyAgent(proxyOptions)
const httpsAgent2 = new SocksProxyAgent(proxyOptions)

let res = await axios.get('https://api.myip.com/', {httpsAgent})
console.log(res.data)

res = await axios.get('https://api.myip.com/', {httpsAgent: httpsAgent2})
console.log(res.data)