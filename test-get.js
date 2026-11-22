async function check() {
  try {
    const res = await fetch("http://localhost:3000/api/test");
    console.log(res.status, await res.text());
  } catch (e) {
    console.log(e);
  }
}
check();
