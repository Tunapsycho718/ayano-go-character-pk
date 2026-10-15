// 替换成你刚刚找到的真实配置
const SUPABASE_URL = "https://bxnrwfmxsreweooserqa.supabase.co";
const SUPABASE_KEY = "sb_publishable_Xn6pT4QTlayFhh6DnMdqMw_PBqe0Ljj";

// 创建数据库连接
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// 提交一局比赛的冠军
async function submitChampion(winnerId) {
  const { error } = await supabaseClient
    .from("champion_results")
    .insert({ winner_id: winnerId });

  if (error) {
    console.error("冠军结果提交失败：", error);
    return false;
  }

  return true;
}