// priority: 0

let Vec3 = Java.loadClass("net.minecraft.world.phys.Vec3")
let Direction = Java.loadClass("net.minecraft.core.Direction")

ComputerCraftEvents.peripheral(event => {
    const BlockId = "vs_clockwork:phys_bearing"
    const PeripheralName = "physics_bearing"
    
    event.registerPeripheral(PeripheralName, BlockId)
    .mainThreadMethod("getAngle", (block, d, args) => {
        const entity = block.getEntity()
        return entity.getAngle()
    })
    .mainThreadMethod("setAxisOffset", (block, d, args) => {
        const entity = block.getEntity()

        const [x, y, z, axis] = args
        
        if (!['X','Y','Z'].includes(axis)) { return 'Invalid axis'}
        
        entity.clockworkdev$setOffset(
            Direction.Axis[axis],
            Vec3(x,y,z)
        )
    })
})
