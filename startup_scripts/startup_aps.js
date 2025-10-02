// priority: 0
// active protection system
// note: allow shooting tows + add redstone compat + APS ammunition

// detection area
const width = 45
const over = 10
const under = 2

// shooting criterias
const maxSpeed = 300
const cooldown = 8
const target_shells = [
    "createbigcannons:he_shell", // HE
    "cbcmodernwarfare:he_mediumshell",

    "createbigcannons:ap_shell", // APHE
    "cbcmodernwarfare:aphe_mediumshell",

    "cbcmodernwarfare:hefrag_shell", // HEF
    "cbcmodernwarfare:hef_mediumshell",

    "cbcmodernwarfare:heap_shell", // HEAT
    "cbcmodernwarfare:heap_mediumshell", 

    "createbigcannons:shrapnel_shell", // Shrapnel
    "canister_mediumshell", // Canister

    "createbigcannons:smoke_shell", // Smoke
    "cbcmodernwarfare:smoke_mediumshell" ,

    "apkws",
    "agm114m",
    "agm114b",
    "katyusha",
    "katyusha",
    "tow2a",
    "tow2b",
    "towbb"
]

const stored_cooldowns = {}
function since(pos_id) {
    const last_fired = stored_cooldowns[pos_id] || 0
    return (Date.now() - last_fired) / 1000
}

const half_width = width / 2
function isProjectile(type) {
    if (type == "tallyho:missile") { return true }
    
    if (!(type.includes('createbigcannons:') || type.includes('cbcmodernwarfare:'))) { return false }

    if (type.includes('shot')) { return true }
    if (type.includes('shell')) { return true }

    return false
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
                type : type
            })
        }
    }

    return projectiles
}

const aps_ammunitions = {}

ComputerCraftEvents.peripheral(event => {
    const BlockId = "kubejs:active_protection_system"
    const PeripheralName = "aps"

    event.registerPeripheral(PeripheralName, BlockId)
    .method("ammoCount", (block) => {
        const {x, y, z} = block
        const pos_id = x+' '+y+' '+z
        return aps_ammunitions[pos_id] || 0
    })
    .method("detect", (block) => {
        return detect(block)
    }).mainThreadMethod("shoot", (block, d, args) => {
        const uuid = args[0].toString()
        if (!uuid) { return "No uuid given" }

        var entity = block.level.getEntity(uuid)
        if (!entity) { return "No entity found" }

        const type = entity.type
        if (!isProjectile(type)) { return "Not a projectile" }

        const {x, y, z} = block
        const pos_id = x+' '+y+' '+z
        const ammo = aps_ammunitions[pos_id] || 0
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

        if (since(pos_id) < cooldown) { return "Cooling down" }
        
        stored_cooldowns[pos_id] = Date.now()
        aps_ammunitions[pos_id] = ammo - 1

        block.level.runCommandSilent(`particle createbigcannons:flak_cloud ${entity.x} ${entity.y} ${entity.z} 0 0 0 0 1 force`)
        block.level.runCommandSilent(`playsound createbigcannons:shell_explosion neutral @a ${entity.x} ${entity.y} ${entity.z} 2.0 1.5 0.5`)

        const speed = entity.deltaMovement.lengthSqr()
        const deathOnShot = (target_shells.includes(type) && (speed < maxSpeed)) || (target_shells.includes(entity.missileId))
        if (deathOnShot) { entity.kill() }
        
        return 'Hit!'
    }).method("getCooldownLeft", (block) => {
        const {x, y, z} = block
        const pos_id = x+' '+y+' '+z
        
        const timeLeft = cooldown - since(pos_id)
        if (timeLeft < 0) { return 0 }

        return timeLeft
    })
})

StartupEvents.registry("block", (event) => {
    event.create("active_protection_system", "cardinal")
    .displayName("Trophy (APS)")
    .soundType("stone")
    .resistance(15.0)

    .renderType('cutout')
    .viewBlocking(true)
    .fullBlock(false)

    .model('kubejs:block/active_protection_system')
    
    .box(1, 0, 1, 15, 23, 15)

    .rightClick(event => {
        const { player, level, item, block, hand } = event

        if (item.id !== 'kubejs:aps_charge') { return }
        
        if (player.cooldowns.isOnCooldown(item.item)) { return }
        player.cooldowns.addCooldown(item.item, 20 * 5)
        
        const {x, y, z} = block
        const pos_id = x+' '+y+' '+z
        const ammo_count = aps_ammunitions[pos_id] || 0

        if (ammo_count >= 2) { return }
        
        item.count--
        aps_ammunitions[pos_id] = ammo_count + 1

        console.log(aps_ammunitions, pos_id)

        block.level.runCommandSilent(`playsound combatgear:smokegrenadelaunch neutral @a ${x} ${y} ${z} 2.0 1.5 0.5`)
        
        // block.entityData.putInt('charges', 1)

        event.cancel()
    })

    .item(item => {
        item.tooltip(Text.of('§8Detects & intercepts incoming projectiles'))
    })
})

StartupEvents.registry('item', event => {
    event.create("aps_charge")
    .displayName("APS Charge")
    .texture('kubejs:item/aps_charge')
    .maxStackSize(1)
    
    .tooltip(Text.of('§8APS Trophy ammunition'))
})