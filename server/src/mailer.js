import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      // 465 端口使用 SSL
      secure: process.env.SMTP_SECURE !== 'false',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * 发送验证码邮件。
 * 说明：阿里云 DirectMail 的「模板 ID」仅用于 SingleSendMail API 方式；
 * 这里采用 SMTP 直发（nodemailer），邮件内容由服务端直接构造，模板 ID 不参与。
 */
export async function sendVerifyCode(to, code) {
  const from = process.env.SMTP_FROM || `迹时 <${process.env.SMTP_USER}>`;

  const html = `
    <div style="background:#0B0E11;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;">
      <div style="max-width:420px;margin:0 auto;background:#1E2329;border:1px solid #2B3139;border-radius:16px;padding:32px 24px;color:#EAECEF;">
        <div style="font-size:18px;font-weight:600;color:#F0B90B;">迹时</div>
        <div style="margin-top:4px;font-size:12px;color:#848E9C;">让时间流向，更有价值的地方。</div>
        <div style="margin-top:24px;font-size:14px;color:#EAECEF;">你的登录验证码是：</div>
        <div style="margin:16px 0;font-size:34px;font-weight:700;letter-spacing:8px;color:#F0B90B;">${code}</div>
        <div style="font-size:12px;color:#848E9C;line-height:1.6;">
          验证码 10 分钟内有效，请勿泄露给他人。<br/>若非本人操作，请忽略本邮件。
        </div>
      </div>
    </div>`;

  return getTransporter().sendMail({
    from,
    to,
    subject: '迹时 · 登录验证码',
    html,
  });
}
