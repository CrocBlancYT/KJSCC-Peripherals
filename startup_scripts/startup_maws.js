// priority: 0

// missile approach weapon system

ComputerCraftEvents.peripheral(event => {
    const BlockId = "kubejs:missile_approach_warning_system"
    const PeripheralName = "maws"

    const maxRange = 100

    function getMissiles(entities) {
        const missiles = []
        
        for (const e in entities) {
            var entity = entities[e]
            if (entity.type == "tallyho:missile") {
                missiles.push(entity)
            }
        }

        return missiles
    }

    event.registerPeripheral(PeripheralName, BlockId)
    .mainThreadMethod("detect", (block, d, args) => {
        const [range] = args
        const halfRange = range/2

        if (halfRange < 0) { halfRange = 0 }
        if (halfRange > maxRange) { halfRange = maxRange }

        const {x, y, z} = block
        const box = AABB.of(x-halfRange, y-halfRange, z-halfRange, x+halfRange, y+halfRange, z+halfRange)
        const entities = block.level.getEntitiesWithin(box)

        const missiles = getMissiles(entities)

        const result = []
        for (const m in missiles) {
            var missile = missiles[m]

            /*for (const m in missile) {
                console.log(m, missile[m])
            }
            
            const {x, y, z} = missile*/

            result.push({
                uuid: missile.uuid.toString(),
                id: missile.missileId
            })
        }
        return result
    })
})

StartupEvents.registry("block", (event) => {
    event.create("missile_approach_warning_system")
    .displayName("MAWS")
    .soundType("stone")
    .resistance(5.0)
    
    .viewBlocking(true)
    .fullBlock(true)
    
    .model('kubejs:block/maws')
    
    .item(item => {
        item.tooltip(Text.of('§8Detects missile launches'))
    })
})

