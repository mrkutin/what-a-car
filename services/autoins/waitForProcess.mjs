//const PROXY = process.env.PROXY || 'socks5://185.132.177.55:32859' // STATIC!!!

import axios from 'axios'
import {SocksProxyAgent} from 'socks-proxy-agent'
//const httpsAgent = new SocksProxyAgent(PROXY)

const waitForProcess = async (processId, cookies, count = 5) => {
    try {
        const res = await axios.get(`https://dkbm-web.autoins.ru/dkbm-web-1.0/checkPolicyInfoStatus.htm?processId=${processId}`, {
            //httpsAgent,
            headers: {
                Cookie: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join(';')
            }
        })
        if (res?.data?.RequestStatusInfo?.RequestStatusCode === 3) {
            return Promise.resolve(true)
        }
        if (res?.data?.RequestStatusInfo?.RequestStatusCode === 14) {
            return Promise.resolve(false)
        }

        if (count === 0) {
            return Promise.reject('Wait for process count is over ')
        }

        await new Promise(resolve => setTimeout(resolve, 1000))
        return waitForProcess(processId, cookies, count - 1)
    } catch (err) {
        return Promise.reject(err.message)
    }
}

// await waitForProcess(1534614576)
// console.log('ok')

export {waitForProcess}
