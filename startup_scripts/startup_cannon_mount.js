// priority: 0

// cannon mounts
// note: block updates will disassemble the cannon mount

function cannon_mount(event, BlockId) {
    const PeripheralName = "cannon_mount"
    
    function hasAutoCannon(block) {
        for (const key in block) {
            if (key == 'inventory') {
                return true
            }
        }
        return false
    }

    event.registerPeripheral(PeripheralName, BlockId)
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

ComputerCraftEvents.peripheral(event => {
    cannon_mount(event, "createbigcannons:cannon_mount")
    cannon_mount(event, "cbcmodernwarfare:compact_mount")
    cannon_mount(event, "createbigcannons:fixed_cannon_mount")
})