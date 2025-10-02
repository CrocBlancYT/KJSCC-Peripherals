// priority: 0

ComputerCraftEvents.peripheral(event => {
    const BlockId = "minecraft:lectern"
    const PeripheralName = "data_link"

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
    
    event.registerPeripheral(PeripheralName, BlockId)
    .mainThreadMethod("status", (block, d, args) => {
        const {player, error} = getPlayer(block)
        if (error) {return error}
        player.setStatusMessage(args[0] || '') // text
    })
})
