import React from 'react';

const Layout = ({ children }) => {
  return (
    <>
      <html lang="en">
			<head>
				<title>Solant</title>
			</head>
			<body>
                {children}
			</body>
		</html>
    </>
  );
};

export default Layout;