
// priority: 0

let QueuedForcesApplier = Java.loadClass("io.github.techtastic.cc_vs.ship.QueuedForcesApplier").Companion
let Vector3d = Java.loadClass("org.joml.Vector3d")

// add energy consumption

function getShipManagingPosUnsafe(world, pos) {
    let x = pos.x / 16
    let z = pos.z / 16
    let dimensionId = world.getDimensionId()
    return world.server.getShipObjectWorld().getAllShips().getByChunkPos(x, z, dimensionId)
}

function clamp(force, limit) {
    if (force > limit) { return limit }
    if (force < -limit) { return -limit }
    return force
}

function getOffsetInShipyard(ship, block) {
    const BlockPos = block.pos
    return Vector3d(BlockPos.x, BlockPos.y, BlockPos.z)
        .add(Vector3d(0.5,0.5,0.5))
        .sub(ship.transform.positionInShip)
}

function getClampedVector(args, limit) {
    const [x, y, z] = args
    return Vector3d(
        clamp(x || 0, limit),
        clamp(y || 0, limit),
        clamp(z || 0, limit)
    )
}

ComputerCraftEvents.peripheral(event =>{
    const BlockId = "kubejs:gyro"
    const PeripheralName = "gyroscope"
    
    const max_angularForce = 3000000 * 0.05
    
    event.registerPeripheral(PeripheralName, BlockId)
    .mainThreadMethod("rotate", (block, d, args) => {        
        const ship = getShipManagingPosUnsafe(block.level, block.pos)
        const control = QueuedForcesApplier.getOrCreateControl(ship)
        
        // const pos = getOffsetInShipyard(ship, block)
        const torque = getClampedVector(args, max_angularForce)

        control.applyRotDependentTorque(torque)
        return
    })
})

StartupEvents.registry("block", (event) => {
    event.create("gyro")
    .displayName("Gyroscope")
    .soundType("stone")
    .resistance(5.0)
    
    .viewBlocking(true)
    .fullBlock(true)
    
    .model('kubejs:block/gyro')
    
    .item(item => {
        item.tooltip(Text.of('§8Controls the angular acceleration'))
    })
})

