
local threads = {}

-- threads are stacked in run (256 threads max)
local function run()
    local event, id = os.pullEvent("new_thread")
    local func = threads[id]
    threads[id] = nil
    parallel.waitForAll(func, run)
end

local function killThread(thread)
    assert(type(thread)=="table", "no thread given")
    assert(thread.id, "do thread:kill()")
    
    os.queueEvent('kill_thread', thread.id)
end

local function newThread(func)
    assert(func, "function missing")

    local id = os.clock() + math.random()
    local handle = {id=id}

    threads[id] = function ()
        parallel.waitForAny(function()
            func(handle)
        end, function ()
            local event, thread_id
            repeat event, thread_id = os.pullEvent("kill_thread")
            until id == thread_id
        end)
    end

    os.queueEvent('new_thread', id)

    return {
        kill=killThread,
        handle=handle,
        id=id,
    }
end



return {run=run, newThread=newThread}