import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Fade from '@mui/material/Fade';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import Box from '@mui/material/Box';

export default function BackToTop() {
  const trigger = useScrollTrigger({
    target: window,
    disableHysteresis: true,
    threshold: 100,
  });

  const handleBackToTop = (e) => {
    const anchor = (e.target.ownerDocument || document).querySelector('#home');

    if (anchor) anchor.scrollIntoView({ block: 'center', behavior: 'smooth'});
  };

  return (
    <Fade in={trigger}>
      <Box
        onClick={handleBackToTop}
        role='presentation'
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        <KeyboardArrowUpIcon  
          aria-label='scroll back to top'
          onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(116, 116, 116, 0.432)'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(71, 71, 71, 0.432)'}
          onMouseDown={(e) => e.target.style.backgroundColor = 'rgba(187, 187, 187, 0.432)'}
          onMouseUp={(e) => e.target.style.backgroundColor = 'rgba(71, 71, 71, 0.432)'}
          sx={{ width: '3rem', height: '3rem', padding: 1, borderRadius: '50px', backgroundColor: 'rgba(71, 71, 71, 0.432)', color: 'inherit' }}
        />  
      </Box>
    </Fade>
  );
}