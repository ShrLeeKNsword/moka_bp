import './App.css';
import Peer, { DataConnection } from 'peerjs';
import { useState, useEffect, useRef } from 'react';
import { Banner, Button } from '@douyinfe/semi-ui';
import imgData from './assets/imgData.json';
import initData from './assets/initData.json';
import { FaShieldAlt } from "react-icons/fa";
import { LuSwords } from "react-icons/lu";

function App() {
  const peerRef = useRef<Peer | null>(null)
  const [data, setData] = useState(initData)
  const hash = useRef(window.location.hash.slice(1))
  const [connection, setConnection] = useState<DataConnection | null>(null)
  const [searchParams, setSearchParams] = useState({ A: '', B: '' })

  //监听主客场信息
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSearchParams({
      A: params.get('A') || '',
      B: params.get('B') || ''
    })
  }, [])

  // 初始化 peer 连接
  useEffect(() => {
    peerRef.current = new Peer()

    if (hash.current) {
      // 展示端模式
      console.info('展示端模式', hash.current)
      peerRef.current.on('open', () => {
        const conn = peerRef.current!.connect(hash.current)
        conn.on('open', () => {
          console.log('Connected to control peer:', hash.current)
          setConnection(conn)
        })
      })
    } else {
      // 控制端模式
      peerRef.current.on('open', (id) => {
        console.log('控制端模式', id)
        window.history.replaceState(null, '', `#${id}`)
      })
    }

    // Handle incoming connections
    peerRef.current.on('connection', (conn) => {
      console.log('Incoming connection from:', conn.peer)
      conn.on('open', () => {
        console.log('Connection established with:', conn.peer)
        setConnection(conn)
      })
    })

    // 清理函数
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy()
      }
    }
  }, []) // 空依赖数组，表示只在组件挂载时执行一次

  useEffect(() => {
    if (hash.current && connection) {
      // 展示端：当收到数据时更新状态
      connection.on('data', (receivedData: unknown) => {
        console.log('Received data:', receivedData)
        if (Array.isArray(receivedData)) {
          setData(receivedData as typeof initData)
        }
      })
    }
  }, [connection])

  useEffect(() => {
    if (!hash.current && connection) {
      // 控制端：当 data 变化时发送数据
      connection.send(data)
      console.log('Sent data:', data)
    }
  }, [data, connection])

  return (
    <div className="relative w-screen min-w-[720px] aspect-video text-4xl font-bold xl:text-6xl bg-gray-100 flex">
      <div className='absolute top-0 w-full flex justify-center items-center text-red-500 my-4 xl:my-12'>{searchParams.A}</div>
      <div className='absolute bottom-0 w-full flex justify-center items-center text-blue-500 my-4 xl:my-12'>{searchParams.B}</div>
      <div className="absolute w-full top-0">
        {hash.current ?
          <></>
          :
          <Banner
            type="info"
            description="本页面为控制页面"
          />}
      </div>
      <div className="grid grid-cols-8 gap-4 xl:gap-8 h-3/5 my-auto mx-6 xl:mx-12 font-medium">
        {imgData.map((item, index) => (
          //通用显示
          <div key={index}
            className={`transition relative flex w-full
              ${(data[index].state == 1) ? "translate-y-[-12%]" : (data[index].state == -1) ? "translate-y-[12%]" : ""}`
            }>
            <div className={`transition absolute w-full h-full overflow-hidden rounded-lg text-white text-xl xl:text-5xl
              ${(data[index].state == 1 && data[index].opponent != 0) ? "translate-y-[12%]" : (data[index].state == -1 && data[index].opponent != 0) ? "translate-y-[-12%]" : ""}`}>
              <div className='w-full h-1/2 bg-red-500 relative flex'>
                <div className={`transition absolute top-0 w-full flex justify-center items-center my-1 xl:my-3 ${data[index].opponent == 1 ? "opacity-0" : "opacity-100"}`}><LuSwords /></div>
                <div className={`transition absolute top-0 w-full flex justify-center items-center my-1 xl:my-3 ${data[index].opponent == -1 ? "opacity-0" : "opacity-100"}`}><FaShieldAlt /></div>
              </div>
              <div className='w-full h-1/2 bg-blue-500 relative'>
                <div className={`transition absolute bottom-0 w-full flex justify-center items-center my-1 xl:my-3 ${data[index].opponent == 1 ? "opacity-0" : "opacity-100"}`}><LuSwords /></div>
                <div className={`transition absolute bottom-0 w-full flex justify-center items-center my-1 xl:my-3 ${data[index].opponent == -1 ? "opacity-0" : "opacity-100"}`}><FaShieldAlt /></div></div>
            </div>
            <div className='w-full h-full overflow-hidden relative flex rounded-lg shadow-lg shadow-black/60'>
              <img className='h-full object-cover w-full' src={item.img} alt={item.name} />
              <span className='absolute bottom-2 text-white text-xs xl:text-2xl w-full drop-shadow-lg'>{item.name}</span>
              <div className='absolute flex justify-center items-center w-full h-full text-center text-white text-5xl'>{data[index].order ? data[index].order : ""}</div>
              {/*被ban时显示*/}
              <div className={`transition absolute top-0 left-0 w-full h-full ${data[index].state == -2 ? "opacity-100" : "opacity-0"} bg-black/50`}></div>
              {/*仅限控制端*/}
              {hash.current ?
                <></>
                :
                <div className='absolute top-0 left-0 w-full h-full grid grid-rows-6 gap-2 py-2 px-1'>
                  <Button theme='solid' disabled={data[index].state == -2} onClick={() => {
                    const newData = [...data];
                    newData[index] = { ...data[index], state: data[index].state == 1 ? 0 : 1 };
                    setData(newData);
                  }}>{data[index].state == 1 ? "撤销" : "A选"}</Button>

                  <Button theme='solid' type="danger" onClick={() => {
                    const newData = [...data];
                    newData[index] = { ...data[index], state: data[index].state == -2 ? 0 : -2 };
                    setData(newData);
                  }}>{data[index].state == -2 ? "撤销" : "禁用"}</Button>

                  <Button theme='solid' disabled={data[index].state == -2} onClick={() => {
                    const newData = [...data];
                    newData[index] = { ...data[index], state: data[index].state == -1 ? 0 : - 1 };
                    setData(newData);
                  }}>{data[index].state == -1 ? "撤销" : "B选"}</Button>

                  <Button theme='solid' type='secondary' disabled={!(data[index].state == -1 || data[index].state == 1)} onClick={() => {
                    const newData = [...data];
                    newData[index] = { ...data[index], opponent: data[index].opponent == -1 ? 0 : - 1 };
                    setData(newData);
                  }}>{data[index].opponent == -1 ? "撤销" : "对攻"}</Button>

                  <Button theme='solid' type='secondary' disabled={!(data[index].state == -1 || data[index].state == 1)} onClick={() => {
                    const newData = [...data];
                    newData[index] = { ...data[index], opponent: data[index].opponent == 1 ? 0 : 1 };
                    setData(newData);
                  }}>{data[index].opponent == 1 ? "撤销" : "对守"}</Button>
                </div>}
            </div>
          </div>
        ))}
      </div>
    </div >
  )
}

export default App
