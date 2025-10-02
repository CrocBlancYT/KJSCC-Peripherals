// priority: 0

// cannon mounts
// note: block updates will disassemble the cannon mount
function cannon_mount(event, id) {
    function hasAutoCannon(block) {
        for (const key in block) {
            if (key == 'inventory') {
                return true
            }
        }
        return false
    }

    event.registerPeripheral("cannon_mount", id)
    .mainThreadMethod("getPitch", (block) => {
        const entity = block.getEntity()
        return entity.getDisplayPitch()
    })
    .mainThreadMethod("getYaw", (block) => {
        const entity = block.getEntity()
        return entity.getDisplayYaw()
    })
    .mainThreadMethod("setPitch", (block, d, args) => {
        if (!hasAutoCannon(block)) { return "Only for auto-cannons" }
        const entity = block.getEntity()
        entity.setPitch(args[0] || 0)
    })
    .mainThreadMethod("setYaw", (block, d, args) => {
        if (!hasAutoCannon(block)) { return "Only for auto-cannons" }
        const entity = block.getEntity()
        entity.setYaw(args[0] || 0)
    })
    .mainThreadMethod("assemble", (block, d, args) => {
        const state = args[0] || false
        const entity = block.getEntity()

        if (state) {
            entity.onRedstoneUpdate(true, false, false, false, 0) }
        else  {
            entity.disassemble()
        }

        entity.tick()
    })
    .mainThreadMethod("fire", (block, d, args) => {
        const firepower = args[0] || 0
        const entity = block.getEntity()

        if (firepower > 0)  {
            entity.onRedstoneUpdate(false, false, true, false, firepower)
        } else  {
            entity.onRedstoneUpdate(false, false, false, true, 0)
        }

        entity.tick()
    })
}

function data_link(event, id) {
    function getPlayer(block) {
        const nbt = block.getEntityData()
        if (!nbt.Book) { return {error: "No player linked"}}
        const Name = nbt.Book.tag.author

        const server = Utils.getServer()
        const players = server.getPlayers()

        var player
        for (const p in players) {
            if (players[p].username == Name) {
                player = players[p]
                break
            }
        }

        if (!player) {return {error: "Player not found"}}

        return {player: player}
    }
    event.registerPeripheral("data_link", id)
    .mainThreadMethod("status", (block, d, args) => {
        const {player, error} = getPlayer(block)
        if (error) {return error}
        player.setStatusMessage(args[0] || '') // text
    })
}

function physics_bearing(event, id) {
    event.registerPeripheral("physics_bearing", id)
    .mainThreadMethod("getAngle", (block, d, args) => {
        const entity = block.getEntity()
        return entity.getAngle()
    })
}

function aps(event, id) {

    // detection area
    const width = 45
    const over = 10
    const under = 2

    // shooting criterias
    const maxSpeed = 300
    const cooldown = 45
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
        "cbcmodernwarfare:smoke_mediumshell" 
    ]

    function since(pos_id) {
        const last_fired = stored_cooldowns[pos_id] || 0
        return (Date.now() - last_fired) / 1000
    }

    const stored_cooldowns = {}
    const half_width = width / 2
    
    function isProjectile(type) {
        if (!(type.includes('createbigcannons:') || type.includes('cbcmodernwarfare:'))) { return false }

        if (type.includes('shot')) { return true }
        if (type.includes('shell')) { return true }

        return false
    }

    function detect(block) {
        const {x, y, z} = block
        const box = AABB.of(x-half_width, y-under, z-half_width, x+half_width, y+over, z+half_width)
        const entities = block.level.getEntitiesWithin(box)

        const detected_shells = []

        for (const e in entities) {
            var entity = entities[e]
            
            var type = entity.type
            var uuid = entity.uuid

            if (isProjectile(type)) {
                detected_shells.push({
                    uuid : uuid.toString(),
                    type : type
                })
            }
        }

        return detected_shells
    }

    event.registerPeripheral("aps", id)
    .method("detect", (block) => {
        return detect(block)
    }).mainThreadMethod("shoot", (block, d, args) => {
        const uuid = args[0].toString()
        if (!uuid) { return "No uuid given" }

        var entity = block.level.getEntity(uuid)
        if (!entity) { return "No entity found" }

        const type = entity.type
        if (!isProjectile(type)) { return "Not a shell" }

        const entities = detect(block)

        var found = false
        for (const e in entities) {
            if (entities[e].uuid == uuid) {
                found = true
                break
            }
        }

        if (!found) { return "Too far" }
        
        const {x, y, z} = block
        const pos_id = x+' '+y+' '+z
        if (since(pos_id) < cooldown) { return "Cooling down" }
        
        stored_cooldowns[pos_id] = Date.now()

        block.level.runCommandSilent(`particle createbigcannons:flak_cloud ${entity.x} ${entity.y} ${entity.z} 0 0 0 0 1 force`)
        block.level.runCommandSilent(`playsound createbigcannons:shell_explosion neutral @a ${entity.x} ${entity.y} ${entity.z} 2.0 1.5 0.5`)
        
        const speed = entity.deltaMovement.lengthSqr()
        const deathOnShot = target_shells.includes(type) && (speed < maxSpeed)
        if (deathOnShot) { entity.kill() }

        return 'Hit!'
    }).method("getCooldownLeft", (block) => {
        const {x, y, z} = block
        const pos_id = x+' '+y+' '+z

        const timeLeft = cooldown - since(pos_id)
        if (timeLeft < 0) { return 0 }

        return timeLeft
    })
}

ComputerCraftEvents.peripheral(event => {
    cannon_mount(event, "createbigcannons:cannon_mount")
    cannon_mount(event, "cbcmodernwarfare:compact_mount")
    cannon_mount(event, "createbigcannons:fixed_cannon_mount")
    
    physics_bearing(event, "vs_clockwork:phys_bearing")

    aps(event, "kubejs:active_protection_system")

    data_link(event, "minecraft:lectern")
})

StartupEvents.registry("block", (event) => {
    event.create("active_protection_system", "cardinal")
    .displayName("Trophy (APS)")
    .soundType("metal")
    .resistance(15.0)

    .renderType('cutout')
    .viewBlocking(true)
    .fullBlock(false)
    
    .model('kubejs:block/active_protection_system')

    .noCollision()
    .box(1, 0, 1, 15, 23, 15)
})
