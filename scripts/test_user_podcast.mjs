import fs from "node:fs";
import path from "node:path";

async function run() {
  const audioSrc = "C:/Users/ADMIN/.gemini/antigravity/brain/b836a2ef-9447-4d2e-89a5-538a6772830d/.user_uploaded/uploaded_media_1794056870778.mp3";
  const audioBuf = fs.readFileSync(audioSrc);
  console.log("Audio file read, size:", audioBuf.length, "bytes");

  // 1. Create project
  const createRes = await fetch("http://localhost:3000/api/v1/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Podcast Thứ Sáu: Mùa Thu & Khoảng Lặng",
      description: "Podcast tự sự đêm thu: Chào bạn, người có cả trăm tab suy nghĩ... Thành phố chậm lại, đèn đường vàng ấm và khoảng lặng cô đơn.",
      aspect_ratio: "16:9",
      resolution: "720p",
      fps: 24,
      language: "vi"
    })
  });
  const projectData = await createRes.json();
  const projId = projectData.project.id;
  console.log("1. Project created:", projId, projectData.project.name);

  // 2. Upload audio using multipart/form-data
  const form = new FormData();
  const blob = new Blob([audioBuf], { type: "audio/mp3" });
  form.append("file", blob, "podcast_thu_sau.mp3");

  const uploadRes = await fetch(`http://localhost:3000/api/v1/projects/${projId}/audio/upload`, {
    method: "POST",
    body: form
  });
  const uploadData = await uploadRes.json();
  console.log("2. Audio uploaded, duration:", uploadData.audio?.duration, "sec, waveform peaks:", uploadData.audio?.waveform?.length);

  // 3. Audio analysis & diarization
  const customHint = `Chào bạn, người có lẽ đang có cả trăm tab suy nghĩ đang mở trong đầu. Cảm ơn bạn vì đã quyết định mở thêm một tab này nữa và dành lựa chọn đó cho mình. Mong rằng âm thanh từ chiếc tab này sẽ đủ dịu dàng để bạn có thể tạm thời lỡ tab khác nhé, và mình là Hu.
Cảm ơn bạn đã đến với podcast thứ sáu của Mình Huế. Dạo này cũng bắt đầu vào mùa thu rồi mọi người ạ. Chiều nay thì gió hơi se lạnh. Cái kiểu thời tiết mà chỉ cần bước ra ngoài ban công là đã thấy cái hơi thở của Thu len lỏi vào trong áo ấy.
Thành phố cũng bắt đầu chậm lại, người người vội vã trở về nhà. Còn ánh đèn đường thì vừa kịp bật lên, vàng ấm nhưng mà cũng đủ để gợi lên cảm giác lạc lõng nào đó. Có lẽ vì thế mà mình luôn thấy những buổi chiều nhạt anh em như thế này dễ khiến người ta nghĩ nhiều hơn bình thường, nhất là khi chỉ có một mình.
Âm nhạc mình không biết là từ khi nào những khoảng lặng như thế này lại khiến mình thấy rõ sự cô đơn đến vậy. Ngồi nhìn dòng xe qua lại, nghe tiếng gió lùa qua khung cửa, tự nhiên thấy tim mình hơi nặng, kiểu không rõ là đang buồn hay là chỉ đang nhớ một điều gì đó đã cũ.
Mình từng nghĩ là cô đơn là khi mà mình chẳng có ai ở bên. Nhưng mà càng lớn thì mình càng hiểu là đôi khi cô đơn là lúc có người ở bên mà lòng mình thì vẫn thấy trống.`;

  const analyzeRes = await fetch(`http://localhost:3000/api/v1/projects/${projId}/audio/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: "mock",
      custom_transcript_hint: customHint
    })
  });
  const analyzeData = await analyzeRes.json();
  console.log("3. Analyzed! Segments:", analyzeData.transcript?.segments?.length, "Speakers:", analyzeData.speakers?.length);

  // 4. Storyboard generation
  const sbRes = await fetch(`http://localhost:3000/api/v1/projects/${projId}/storyboard/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "mock" })
  });
  const sbData = await sbRes.json();
  console.log("4. Storyboard generated! Scenes:", sbData.scenes?.length);
  sbData.scenes?.forEach((s, i) => {
    console.log(`   Scene ${i+1} [${s.start_time}s - ${s.end_time}s]: ${s.background?.asset_id} | action: ${s.characters?.[0]?.action} | expr: ${s.characters?.[0]?.expression} | "${s.transcript_text?.slice(0, 45)}..."`);
  });

  // 5. Video render
  console.log("5. Rendering video with real FFmpeg...");
  const renderRes = await fetch(`http://localhost:3000/api/v1/projects/${projId}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ force: true })
  });
  const renderData = await renderRes.json();
  console.log("5. Render finished! Status:", renderData.render_job?.status, "MP4 Asset ID:", renderData.output_asset_id);
  console.log("All done!");
}

run().catch((err) => {
  console.error("Pipeline test failed:", err);
  process.exit(1);
});
