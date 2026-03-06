// Serviço para verificar o status das mensagens enviadas
export const checkMessageStatus = async (messageSid: string) => {
  const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
  
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${messageSid}.json`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        },
      }
    );
    
    const message = await response.json();
    return message;
  } catch (error) {
    return null;
  }
};

// Função para verificar se o número está no sandbox
export const checkSandboxStatus = async () => {
  const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
  
  try {
    // Verificar se temos um número WhatsApp configurado
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        },
      }
    );
    
    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
};
