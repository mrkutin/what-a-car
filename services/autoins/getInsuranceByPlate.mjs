import {getProcessId} from './getProcessId.mjs'
import {waitForProcess} from './waitForProcess.mjs'
import {getProcessedInsurance} from './getProcessedInsurance.mjs'

const getInsuranceByPlate = async plate => {
    try {
        console.log('plate: ', plate)
        const processId = await getProcessId(plate)
        if(!processId){
            return null
        }
        console.log('processId: ', processId)
        await waitForProcess(processId)
        const autoins = await getProcessedInsurance(processId)
        console.log('autoins: ', autoins)
        return autoins
    } catch (e) {
        console.log(e.message)
        return null
    }
}

// let res = await getInsuranceByPlate('Х162НС790')
// console.log('res: ', res)
// res = await getInsuranceByPlate('Р818РК799')
// console.log('res: ', res)

export {getInsuranceByPlate}