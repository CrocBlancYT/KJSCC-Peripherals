// priority: 0

function getShipManagingPosUnsafe(world, pos) {
    let x = pos.x / 16
    let z = pos.z / 16
    let dimensionId = world.getDimensionId()
    return world.server.getShipObjectWorld().getAllShips().getByChunkPos(x, z, dimensionId)
}

ComputerCraftEvents.peripheral(event => {
    const BlockId = "kubejs:weapons_manager"
    const PeripheralName = "weapons_manager"

    const range = 7 // ripple block range

    function getMissilesNearby(block) {
        const {x,y,z,level} = block

        const halfRange = range/2
        const box = AABB.of(x-halfRange, y-halfRange, z-halfRange, x+halfRange, y+halfRange, z+halfRange)
        const entities = level.getEntitiesWithin(box)

        const missiles = []
        for (const e in entities) {
            var entity = entities[e]
            if (entity.type == "tallyho:missile") {
                missiles.push(entity)
            }
        }

        return missiles
    }
    
    function getNearbyFromUUID(block, uuid) {
        const missiles = getMissilesNearby(block)

        for (const m in missiles) {
            var missile = missiles[m]
            if (missile.uuid.toString() == uuid) {
                return missile
            }
        }
    }
    
    event.registerPeripheral(PeripheralName, BlockId)
    .mainThreadMethod("scan", (block, d, args) => {        
        const missiles = getMissilesNearby(block)
        
        const result = {}

        for (const m in missiles) {
            var missile = missiles[m]
            var id = missile.missileId

            var missileList = result[id]

            if (!missileList) {
                missileList = []
                result[id] = missileList
            }
            
            missileList.push(missile.uuid.toString())
        }

        return result
    })
    .mainThreadMethod("setRotation", (block, d, args) => {
        const [uuid, yaw, pitch] = args
        const missile = getNearbyFromUUID(block, uuid)
        
        if (!missile) { return "Not found"}

        // only on missile joint blocks
        
        missile.setXRot(pitch)
        missile.setYRot(yaw)

        return true
    })
    .mainThreadMethod("fire", (block, d, args) => {
        const ship = getShipManagingPosUnsafe(block.level, block.pos)
        
        const [uuid] = args
        const missile = getNearbyFromUUID(block, uuid)

        if (!missile) { return "Not found"}
        
        const {guidance} = missile
        if (guidance) { guidance.setCode(ship.slug) }

        missile.launch()
        return true
    })
})

StartupEvents.registry("block", (event) => {
    event.create("weapons_manager")
    .displayName("Weapons Manager")
    .soundType("stone")
    .resistance(5.0)
    
    .viewBlocking(true)
    .fullBlock(true)
    
    .model('kubejs:block/weapons_manager')

    .item(item => {
        item.tooltip(Text.of('§8Controls the connected Tallyho weapons'))
    })
})