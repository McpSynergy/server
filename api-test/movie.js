const main = async () => {
  const response = await fetch(
    `http://192.168.78.14:9999/ugreen/v1/video/search?language=zh-CN&search_type=1&offset=0&limit=200&keyword=${encodeURIComponent("大话西游")}`,
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "zh-CN,zh;q=0.9",
        "client-id": "fb2e26f4-4c37-46d5-9392-WEB",
        "client-version": "1",
        "ug-agent": "PC/WEB",
        "x-specify-language": "zh-CN",
        "x-ugreen-security-key": "dbb09f012a75f55f1c1c4126feff5888",
        "x-ugreen-token":
          "h3utuuo70x+2FNDMSZ/yNLNqrqdqjiZdJdW/+UZP57T8ebaLonsLC7zHTRkbVVoSHxZStlJkCGcIVniEF2wnAL1NKS8dEAILtzzKVtT7hPO5Z7y7x62Lrc16awJ+QBXdQre1sHp235OcEap4i/wqkO/6huKYhGxBLjCkz+rglYCWe3Y/2MhZanAbF+yIGH4XtcpQb51gonVJTqCVPcaRQDLkNLirELYg4awaq1Wy2QHCb8etO+W+KfvgIdliKHA8xWxObBHGN+5jAixQWMQOMJWgASiyH588LF/Kzn4528AfPWVPKMtsrvXzh5fthqTOXN1G7VU5IbkP/qY9E5umxg==",
      },
      body: null,
      method: "GET",
    },
  );
  const data = await response.json();
  console.log(data.data.movies_list);
};

main();
