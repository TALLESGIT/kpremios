import { Heart } from 'lucide-react';

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-primary-dark mt-auto border-t border-white/5 relative overflow-hidden">
      {/* Detail element - Cruzeiro Stars Pattern could go here */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-30"></div>

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-8 md:order-2">
          <a href="https://www.instagram.com/itallozk/" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white hover:scale-110 transition-all duration-300">
            <span className="sr-only">Instagram</span>
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                clipRule="evenodd"
              />
            </svg>
          </a>
          <a href="https://www.youtube.com/channel/UCyP-ZyjtM-I-J2mfI-utNtw" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white hover:scale-110 transition-all duration-300">
            <span className="sr-only">YouTube</span>
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z"
                clipRule="evenodd"
              />
            </svg>
          </a>
          <a href="https://wa.me/5531972393341" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white hover:scale-110 transition-all duration-300">
            <span className="sr-only">WhatsApp Suporte</span>
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M20.472 3.528C18.28 1.336 15.31 0 12.095 0 5.495 0 .142 5.353.142 11.953c0 2.106.546 4.164 1.584 5.976L0 24l6.335-1.661a11.86 11.86 0 005.683 1.45h.005c6.6 0 11.947-5.353 11.947-11.953 0-3.215-1.33-6.179-3.498-8.308zm-8.377 18.392h-.004a9.87 9.87 0 01-5.023-1.374l-.36-.214-3.726.976 1-3.648-.235-.374a9.89 9.89 0 01-1.51-5.313c0-5.484 4.468-9.947 9.957-9.947 2.659 0 5.157 1.036 7.032 2.92 1.881 1.88 2.92 4.374 2.915 7.033-.004 5.48-4.473 9.941-9.946 9.941zm5.434-7.483c-.301-.15-1.767-.871-2.04-.97-.274-.099-.472-.148-.672.15-.197.298-.772.97-.947 1.165-.174.199-.349.223-.648.075-.3-.15-1.267-.466-2.414-1.485-.892-.797-1.493-1.78-1.668-2.078-.174-.299-.019-.458.13-.607.135-.133.3-.348.45-.52.149-.174.199-.298.299-.497.099-.198.05-.372-.025-.52-.075-.15-.672-1.62-.92-2.219-.242-.579-.487-.5-.672-.51-.174-.008-.372-.01-.57-.01-.199 0-.498.074-.757.373-.26.298-.995 1.02-.995 2.494s1.019 2.91 1.169 3.11c.149.197 2.096 3.2 5.074 4.487.71.306 1.263.489 1.694.625.712.226 1.36.194 1.872.118.57-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>
        <div className="mt-8 md:mt-0 md:order-1">
          <p className="text-center text-base text-gray-400 flex items-center justify-center font-medium">
            &copy; {year} ZK Oficial. Feito com
            <Heart className="h-4 w-4 mx-1 text-red-500 animate-pulse" /> por <a href="https://wa.me/5533999030124" target="_blank" rel="noopener noreferrer" className="text-white hover:text-accent transition-colors duration-300 ml-1 font-bold">Tales Coelho</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;