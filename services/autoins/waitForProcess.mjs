import axios from 'axios'

const waitForProcess = async (processId, count = 5) => {
    try {
        const res = await axios.get(`https://dkbm-web.autoins.ru/dkbm-web-1.0/checkPolicyInfoStatus.htm?processId=${processId}`)
        if (res?.data?.RequestStatusInfo?.RequestStatusCode === 3) {
            return Promise.resolve()
        }

        if (count === 0) {
            return Promise.reject('Wait for process count is over ')
        }

        await new Promise(resolve => setTimeout(resolve, 1000))
        return waitForProcess(processId, count - 1)
    } catch (err) {
        return Promise.reject(err.message)
    }
}

// await waitForProcess(1534614576)
// console.log('ok')

export {waitForProcess}
