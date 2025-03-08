//  src, yes this is rerubi based shit obf

let DefaultSettings = {
    '__VERSION__': '0.1.0',

    'Debug': false,
    'SkipMinify': false,
    'useRewriteGenerator': true,

    'BeautifyDebug': true,
    'PrintStep': true,
    'JIT': false,
    'Watermark': `This file is protected with ToonTown Obfuscation V1`,
    'Uid': '1',

    'AntiTamper': true,
    'MaximumSecurity': true,
    'UseSuperops': false
}

global.TopDir = __dirname
const fs = require('fs')
const path = require('path')
const child_process = require('child_process')
const BytecodeLib = require('./Bytecode')
const MacroLib = require('./Macros')
const ObfuscatorLib = require('./Obfuscator')
const GeneratorLib = require('./Generator')
const luamin = require('./minify.js')
const luamin2 = require('./luamin.js')
//let { stdout, stderr } = await exec(`cd "${path.join(__dirname, 'LUA')}" && lua.exe bytecodeDump.lua "${path.join(__dirname, 'temp', 'input.lua')}" "${path.join(__dirname, 'temp', 'output.hex')}"`)
async function dumpBytecode(source, input, output) {
    fs.writeFileSync(input, source)
    //console.log(`starting on ${process.platform}`)
    let file = process.platform === 'linux' ? 'lua5.1' : path.join(__dirname, 'lua', 'lua.exe')
    let settings = [ 
        path.join(__dirname, 'lua', 'bytecodeDump.lua'),
        input,
        output
    ]

    let linuxFix = `chmod +x "${file}"`
    let command = `${file} "${settings[0]}" "${settings[1]}" "${settings[2]}"`
    //if (process.platform === 'linux')
        //child_process.execSync(linuxFix)

    let ret = child_process.execSync(command)
    let { stderr, stdout } = ret
    if (stderr && stdout)
        console.log("ret(seo),", stderr.toString(), stdout.toString());
    else if(Buffer.isBuffer(ret))
        console.log("ret(b),", ret.toString());
    else
        console.log("ret,", ret);
    
    if (stderr !== '' && stderr !== null && stderr !== undefined)
        return { bytecode: '', error: stderr, stdout: stdout }
    return { bytecode: fs.readFileSync(output), error: null, out: ret.toString() }
}

//const opdata = require('./Bytecode/opdata.json')
module.exports = {
    obfuscate: async function(source, settings = DefaultSettings) {
        settings.TopDir = __dirname
        for (let i of Object.keys(DefaultSettings))
            settings[i] = settings[i] !== undefined ? settings[i] : DefaultSettings[i];
        
        // Dump bytecode from source
        if (settings.PrintStep)
            console.log('Dumping bytecode...')
        let inputFile = path.join(__dirname, 'temp', `input-${settings.Uid}.lua`)
        let outputFile = path.join(__dirname, 'temp', `output-${settings.Uid}.out`)
        let bytecodeData = null
        try {
            bytecodeData = await dumpBytecode(source, inputFile, outputFile)
        } catch(err) {
            try { fs.unlinkSync(inputFile) } catch(err) {}
            try { fs.unlinkSync(outputFile) } catch(err) {}
            throw err // idk why I do this, fuck off
        }

        try { fs.unlinkSync(inputFile) } catch(err) {}
        try { fs.unlinkSync(outputFile) } catch(err) {}


        if (bytecodeData.error !== null)
            throw `Errored, ${bytecodeData.error}`
        
        if (settings.PrintStep)
            console.log(bytecodeData.bytecode)
        if (settings.PrintStep)
            console.log('Decoding bytestring...')
        let byteString = bytecodeData.bytecode

        let chunkTree = await BytecodeLib.DecodeBytestring(byteString, settings)

        if (settings.PrintStep)
            console.log('Loading macros...')
        MacroLib.Visit(chunkTree, settings)
        if (settings.PrintStep)
            console.log('Modifying/Obfuscating chunk tree...')
        chunkTree = ObfuscatorLib.ModifyTree(chunkTree, settings)
        /*for (let i in chunkTree.Chunk.UsedInstructions) {
            console.log([ chunkTree.Opmap[i.toString()] ])
        }*/
    
        if (settings.PrintStep)
            console.log('Generating obfuscated code...')
        let code = await GeneratorLib.Generate(chunkTree, settings)
        if (settings.PrintStep) {
            console.log('Minifying code...')
        }

        if (settings.SkipMinify) {
            code = luamin2.Beautify(code, {
                RenameVariables: false,
                RenameGlobals: false,
                SolveMath: false
            })
        } else {
            if (settings.Debug === true) {
                if (settings.BeautifyDebug) {
                    code = luamin2.Beautify(code, {
                        RenameVariables: false,
                        RenameGlobals: false,
                        SolveMath: false
                    })
                }
            } else {
                // luamin.Minify
                code = luamin.Minify(code, {
                    RenameVariables: true,
                    RenameGlobals: false,
                    SolveMath: false
                })
            }
    
        }
        code = `--[[\n\   
88888888888                     88888888888                                    .d88888b.  888       .d888                                     888    d8b                        888     888  d888   
    888                             888                                       d88P" "Y88b 888      d88P"                                      888    Y8P                        888     888 d8888   
    888                             888                                       888     888 888      888                                        888                               888     888   888   
    888   .d88b.   .d88b.  88888b.  888   .d88b.  888  888  888 88888b.       888     888 88888b.  888888 888  888 .d8888b   .d8888b  8888b.  888888 888  .d88b.  88888b.       Y88b   d88P   888   
    888  d88""88b d88""88b 888 "88b 888  d88""88b 888  888  888 888 "88b      888     888 888 "88b 888    888  888 88K      d88P"        "88b 888    888 d88""88b 888 "88b       Y88b d88P    888   
    888  888  888 888  888 888  888 888  888  888 888  888  888 888  888      888     888 888  888 888    888  888 "Y8888b. 888      .d888888 888    888 888  888 888  888        Y88o88P     888   
    888  Y88..88P Y88..88P 888  888 888  Y88..88P Y88b 888 d88P 888  888      Y88b. .d88P 888 d88P 888    Y88b 888      X88 Y88b.    888  888 Y88b.  888 Y88..88P 888  888         Y888P      888   
    888   "Y88P"   "Y88P"  888  888 888   "Y88P"   "Y8888888P"  888  888       "Y88888P"  88888P"  888     "Y88888  88888P'  "Y8888P "Y888888  "Y888 888  "Y88P"  888  888          Y8P     8888888 
                                                                                                                                                                                                    
                                                                                                                                                                                                    
                                                                                                                                                                                                    
, , v${settings.__VERSION__}\n--]]\n\n` + code

        if (settings.JIT && process.platform === 'win32') {
            console.log(`Running file ('./obf/temp/output.lua')...`)
            fs.writeFileSync(`./obf/temp/output.lua`, code)
            try {
                await exec(`cd temp && lua output.lua`, { timeout: 2000 }, (err, stdout, stderr) => {
                    if (err) {
                        if (err.killed) {
                            console.log("Timeout!")
                        } else {
                            console.log("output:", stdout, stderr)
                        }
                    } else {
                        console.log(stdout)
                    }
                })
            } catch(err) { }
        }

        let outPath = path.join(__dirname, 'temp', `output-${settings.Uid}.lua`)
        fs.writeFileSync(outPath, code)

        return [ outPath, settings ]
    }
}
