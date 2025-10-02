// priority: 0

ComputerCraftEvents.peripheral(event => {
    const BlockId = "vs_clockwork:phys_bearing"
    const PeripheralName = "physics_bearing"
    
    event.registerPeripheral(PeripheralName, BlockId)
    .mainThreadMethod("getAngle", (block, d, args) => {
        const entity = block.getEntity()
        return entity.getAngle()
    })
})
