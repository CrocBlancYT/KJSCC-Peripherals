// priority: 0
// active protection system

// detection area
const width = 45
const over = 10
const under = 2

const maxCharges = 2

const loadingCooldown = 5
const shootingCooldown = 5

// shooting criterias
const maxSpeed = 300
const minSpeed = 0.1

const counters = {
    // AP
    "createbigcannons:shot" :       {type: "kinetic", deviate: 0.4}, 
    "createbigcannons:shot" :       {type: "kinetic", deviate: 0.4}, 

    // HE
    "createbigcannons:he_shell" :       {type: "chemical"}, 
    "cbcmodernwarfare:he_mediumshell" : {type: "chemical"},

    // APHE
    "createbigcannons:ap_shell" :         {type: "chemical"}, 
    "cbcmodernwarfare:aphe_mediumshell" : {type: "chemical"},

    // HE-F
    "cbcmodernwarfare:hefrag_shell" :    {type: "chemical"},
    "cbcmodernwarfare:hef_mediumshell" : {type: "chemical"},

    // HEAT
    "cbcmodernwarfare:heap_shell" :       {type: "chemical"}, 
    "cbcmodernwarfare:heap_mediumshell" : {type: "chemical"},

    // Shrapnel
    "createbigcannons:shrapnel_shell" : {type: "kinetic", deviate: 0.4},
    
    // Canister
    "cbcmodernwarfare:canister_mediumshell" : {type: "chemical"}, 

    // Smoke
    "createbigcannons:smoke_shell" :       {type: "kinetic", deviate: 0.4},
    "cbcmodernwarfare:smoke_mediumshell" : {type: "kinetic", deviate: 0.4},
    
    // Rockets
    "apkws" :   {type: "chemical"},
    "katyusha" :{type: "chemical"},
    
    // AGMs
    "agm114m" : {type: "chemical"},
    "agm114b" : {type: "chemical"},

    // ATGMs
    "tow2a" :   {type: "chemical"},
    "tow2b" :   {type: "chemical"},
    "towbb" :   {type: "chemical"},
}

const half_width = width / 2
function isProjectile(type) {
    if (type == "tallyho:missile") { return true }
    
    if (!(type.includes('createbigcannons:') || type.includes('cbcmodernwarfare:'))) { return false }

    if (type.includes('shot')) { return true }
    if (type.includes('shell')) { return true }

    return false
}

function tryKill(counter, entity) {    
    if (counter.type == "chemical") {
        entity.kill()
    } else if (counter.type == "kinetic") {
        let motionX = entity.getMotionX()
        let motionY = entity.getMotionY()
        let motionZ = entity.getMotionZ()
        let deviateMult = counter.deviate

        entity.setMotion(
            motionX * (1 - deviateMult) + (Math.random() * deviateMult * 2),
            motionY * (1 - deviateMult) + (Math.random() * deviateMult * 2),
            motionZ * (1 - deviateMult) + (Math.random() * deviateMult * 2)
        )
    }
}

function detect(block) { // gets the entities within range & formats them
    const {x, y, z} = block
    const box = AABB.of(x-half_width, y-under, z-half_width, x+half_width, y+over, z+half_width)
    const entities = block.level.getEntitiesWithin(box)

    const projectiles = []
    
    for (const e in entities) {
        var entity = entities[e]
            
        var type = entity.type
        var uuid = entity.uuid
        
        if (isProjectile(type)) {
            projectiles.push({
                uuid : uuid.toString(),
                type : type,
                x : entity.x,
                y : entity.y,
                z : entity.z
            })
        }
    }

    return projectiles
}

function intercept(block, uuid) {
    var entity = block.level.getEntity(uuid)
    if (!entity) { return "No entity found" }

    const type = entity.type
    if (!isProjectile(type)) { return "Not a projectile" }
    
    // APS ammo
    const ammo = block.entityData.data.getInt('charges')
    if (ammo <= 0) { return "APS not loaded" }

    const entities = detect(block)

    var found = false
    for (const e in entities) {
        if (entities[e].uuid == uuid) {
            found = true
            break
        }
    }
        
    if (!found) { return "Too far" }

    let speed = entity.deltaMovement.lengthSqr()
    if (speed < minSpeed) { return 'Too slow'}
    
    let cooldown = block.getEntityData().data.getInt('cooldown')
    if (cooldown > 0) { return "Cooling down" }
    
    // APS ammo usage + cooldown
    block.entityData.data.putInt('charges', ammo - 1)
    block.entityData.data.putInt('cooldown', shootingCooldown * 20)

    // APS effects
    block.level.runCommandSilent(`particle createbigcannons:flak_cloud ${entity.x} ${entity.y} ${entity.z} 0 0 0 0 1 force`)
    block.level.runCommandSilent(`playsound createbigcannons:shell_explosion neutral @a ${entity.x} ${entity.y} ${entity.z} 2.0 1.5 0.5`)
    
    let counter = counters[type] || counters[entity.missileId || '']
    
    if (counter && (speed < maxSpeed)) {
        tryKill(counter, entity)
    }
    
    return 'Hit!'
}

ComputerCraftEvents.peripheral(event => {
    const variants = ['desert', 'parade', 'snow', '4bo', 'grizzly', 'gravel']
    const BlocksIds = []
    variants.forEach(value => {BlocksIds.push("kubejs:active_protection_system_"+value)})

    const PeripheralName = "aps"

    event.registerComplexPeripheral(PeripheralName, Block => {return BlocksIds.includes(Block.getId())})
    .mainThreadMethod("getCharges", (block) => {
        return block.entityData.data.getInt('charges')
    })
    .method("detect", (block) => {
        return detect(block)
    }).mainThreadMethod("intercept", (block, d, args) => {
        const uuid = args[0].toString()
        if (!uuid) { return "No uuid given" }
        return intercept(block, uuid)
    }).mainThreadMethod("getCooldown", (block) => {
        return block.getEntityData().data.getInt('cooldown')
    })
})

function Register(event, display_variant, variant) {
    event.create("active_protection_system_"+variant, "cardinal")
    .displayName(display_variant+" Trophy (APS)")
    .soundType("stone")
    .resistance(15.0)

    .renderType('cutout')
    .viewBlocking(true)
    .fullBlock(false)
    
    .model("kubejs:block/aps_"+variant)

    .box(1, 0, 1, 15, 13, 15)

    .rightClick(event => {
        const { player, item, block } = event

        if (item.id !== 'kubejs:aps_charge') { return }
        
        if (player.cooldowns.isOnCooldown(item.item)) { return }
        player.cooldowns.addCooldown(item.item, 20 * loadingCooldown)
        
        const {x, y, z} = block
        const charges = block.entityData.data.getInt('charges')

        if (charges >= maxCharges) { return }
        
        // transfer charge to APS
        item.count--
        block.entityData.data.putInt('charges', charges+1)

        // reload sound effect
        block.level.runCommandSilent(`playsound combatgear:smokegrenadelaunch neutral @a ${x} ${y} ${z} 2.0 1.5 0.5`)
    })
    
    .item(item => {
        item.tooltip(Text.of('§8Detects & intercepts incoming projectiles'))
    })

    .blockEntity(event => {        
        event.initialData({
            charges: 0,
            cooldown: shootingCooldown * 20
        })
        
        event.tick(ticked => {
            let block = ticked.getBlock()
            
            const redstonePower = block.level.getBestNeighborSignal(block.pos)

            if (redstonePower > 0) {
                let projectiles = detect(block)

                projectiles.forEach(proj => {
                    intercept(block, proj.uuid)
                })
            }

            let cooldown = block.entityData.data.getInt('cooldown')
            if (cooldown > 0) {
                cooldown--
                if (cooldown < 0 ){ cooldown = 0 }
                block.entityData.data.putInt('cooldown', cooldown)
            }
        })
    })
}

StartupEvents.registry("block", (event) => {
    Register(event, 'Desert', 'desert')
    Register(event, 'Parade', 'parade')
    Register(event, 'Snow', 'snow')
    Register(event, '4BO', '4bo')
    Register(event, 'Charcoal', 'charcoal')
    Register(event, 'Grizzly', 'grizzly')
    Register(event, 'Gravel', 'gravel')
})

StartupEvents.registry('item', event => {
    event.create("aps_charge")
    .displayName("APS Charge")
    .texture('kubejs:item/aps_charge')
    .maxStackSize(1)
    
    .tooltip(Text.of('§8APS Trophy ammunition'))
})