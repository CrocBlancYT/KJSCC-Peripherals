// priority: 0

let VSGameUtils = Java.loadClass("org.valkyrienskies.mod.common.VSGameUtilsKt");
let QueuedForcesApplier = Java.loadClass("io.github.techtastic.cc_vs.ship.QueuedForcesApplier").Companion
let Vector3d = Java.loadClass("org.joml.Vector3d")

let Vec3 = Java.loadClass('net.minecraft.world.phys.Vec3')
let ClipContext = Java.loadClass('net.minecraft.world.level.ClipContext')
let CollisionContext = Java.loadClass('net.minecraft.world.phys.shapes.CollisionContext')

ComputerCraftEvents.peripheral(event => {
    const BlockId = "kubejs:raycaster"
    const PeripheralName = "raycaster2"
    
    const faceToDir = {
        south: Vector3d(0,0,1),
        east: Vector3d(1,0,0),
        north: Vector3d(0,0,-1),
        west: Vector3d(-1,0,0)
    }
    
    function raycast(level, start, end) {
        const context = ClipContext(
            new Vec3(start.x, start.y, start.z),
            new Vec3(end.x, end.y, end.z),
            ClipContext.Block.COLLIDER, // OUTLINE
            ClipContext.Fluid.NONE,
            null
        )

        return level.clip(context)
    }
    
    event.registerPeripheral(PeripheralName, BlockId)
    .mainThreadMethod("raycast", (block, d, args) => {
        const {pos, level} = block
        const [dx,dy,dz] = args
        
        const facing = block.blockState.getValue(BlockProperties.HORIZONTAL_FACING)
        const offset = faceToDir[facing]
        
        const startPos = Vector3d(pos.x, pos.y, pos.z).
            add(Vector3d(0.5,0.5,0.5)).add(offset)

        const endPos = Vector3d()
            .add(startPos).add(offset).add(Vector3d(dx,dy,dz))
            

        const ship = VSGameUtils.getShipObjectManagingPos(block.level, block.pos);

        if (ship) {
            ship.transform.shipToWorld.transformPosition(startPos)
            ship.transform.shipToWorld.transformPosition(endPos)
        }
        
        const hitResult = raycast(level, startPos, endPos);
        
        var result = {case: "MISS"}

        if (hitResult.type.toString() == "BLOCK") {
            const {blockPos, location, direction} = hitResult
            
            const blockState = level.getBlockState(blockPos)
            const block = blockState.getBlock()

            const hitShip = VSGameUtils.getShipObjectManagingPos(level, blockPos);

            result = {
                case: (hitShip && "SHIP") || "BLOCK",
                worldPos: {x:location.x(), y:location.y(), z:location.z()},
                blockPos: {x:blockPos.x, y:blockPos.y, z:blockPos.z},

                type: block.id,
                normalFace: direction.toString(),

                shipId: (hitShip && hitShip.id),
                shipSlug: (hitShip && hitShip.slug)
            }
        }

        return result
    })
})

StartupEvents.registry("block", (event) => {
    event.create("raycaster", "cardinal")
    .displayName("Raycaster")
    .soundType("stone")
    .resistance(5.0)

    .renderType('cutout')
    .viewBlocking(true)
    .fullBlock(true)
    
    .model('kubejs:block/raycaster')
})