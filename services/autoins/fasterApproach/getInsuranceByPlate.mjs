import {getProcessId} from './getProcessId.mjs'
import {waitForProcess} from './waitForProcess.mjs'
import {getProcessedInsurance} from './getProcessedInsurance.mjs'

const getInsuranceByPlate = async plate => {
    console.log('plate: ', plate)
    const {processId, cookies} = await getProcessId(plate)
    if (!processId) {
        return null
    }
    console.log('processId: ', processId)
    const found = await waitForProcess(processId, cookies)
    if(found){
        const autoins = await getProcessedInsurance(processId, cookies)
        console.log('autoins: ', autoins)
        return autoins
    }
    console.log('not found')
    return null
}

// await getInsuranceByPlate('А837АХ797')
await getInsuranceByPlate('о957сх799')
// await getInsuranceByPlate('М121АХ750')

export {getInsuranceByPlate}