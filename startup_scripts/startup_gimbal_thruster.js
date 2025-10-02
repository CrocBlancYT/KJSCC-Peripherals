// priority: 0

let VSGameUtils = Java.loadClass("org.valkyrienskies.mod.common.VSGameUtilsKt");
let QueuedForcesApplier = Java.loadClass("io.github.techtastic.cc_vs.ship.QueuedForcesApplier").Companion
let Vector3d = Java.loadClass("org.joml.Vector3d")

// add fuel consumption

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

ComputerCraftEvents.peripheral(event => {
    if (true) { return } // disabled peripheral
    
    const BlockId = "minecraft:green_wool"
    const PeripheralName = "gimbaled_thruster"
    
    const max_linearForce = 10000000
    
    event.registerPeripheral(PeripheralName, BlockId)
    .mainThreadMethod("push", (block, d, args) => {
        const ship = VSGameUtils.getShipObjectManagingPos(block.level, block.pos);
        const control = QueuedForcesApplier.getOrCreateControl(ship)
        
        const pos = getOffsetInShipyard(ship, block)
        const force = getClampedVector(args, max_linearForce)
        
        control.applyRotDependentForceToPos(force, pos)
        return
    })
})
